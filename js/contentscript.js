/* global jQuery, chrome, _, Promise */

var runningTasks = [];
var $ = jQuery;
var NEXT_TASK_WAIT = 100;

chrome.runtime.onMessage.addListener(function( msg, sender, sendResponse ) {

    var msgType = msg && msg.type;

    if ( msgType === 'webRequest' ) {

        console.log( 'onMessage', msg );
    }

    if ( msgType === 'run-task' ) {

        chrome.storage.local.get( ['tasks', 'jobs', 'selectedJobId'], function( storage ) {

            var selectedJob;

            if(!storage.jobs || !storage.jobs.length) {
                return;
            }

            selectedJob = storage.jobs.find(function ( v ) {
                return v.jobId === storage.selectedJobId;
            });

            // runningTasks = storage.tasks || [];
            runningTasks = selectedJob.tasks || [];

            // remove disabled task
            runningTasks = runningTasks.filter(function( v ) {

                return !v.disabled;
            });

            chrome.runtime.sendMessage({
                type: 'listen-connection-changed'
            }, function() {

                runTasks();
            });
        });
    }
});

function runTasks() {

    var wait, nextTask;
    var task = runningTasks.shift();

    if ( !task ) {

        return;
    }

    execTask( task ).then(function() {

        if ( runningTasks.length ) {

            nextTask = runningTasks[0];
            wait = ( isNaN( +nextTask.wait ) ? 0 : +nextTask.wait ) + NEXT_TASK_WAIT;

            waitConn().then(function() {

                _.delay( runTasks, wait );
            });
        } else {

            chrome.runtime.sendMessage({
                type: 'ignore-connection-changed'
            });
        }
    });
}

function execTask( task ) {

    var $ele = $( task.selector );
    var ele = $ele[0];

    if ( !ele ) {

        console.error( 'Element not found', task );
        return Promise.reject( 'Element not found' );
    }

    if ( task.type === 'click' ) {

        ele.dispatchEvent( new MouseEvent( 'click' ));

    } else if ( task.type === 'text' ) {

        $ele.val( task.data );

        ele.dispatchEvent( new Event( 'change' ));
    }

    return new Promise(function( resolve ) {

        setTimeout(function() {

            resolve();
        }, 1 );
    });
}

function waitConn() {

    return new Promise(function( resolve, reject ) {

        conn(function( res ) {

            console.warn( 'wait conn resolved.' );

            resolve( res );
        });
    });

    function conn( cb ) {

        setTimeout(function() {

            chrome.runtime.sendMessage({
                type: 'get-connection'
            }, function( res ) {

                var counted = _.countBy( res, function( v ) {

                    return v.state;
                });

                if ( !counted.before || counted.before.length ) {

                    cb( counted );
                } else {

                    conn( cb );
                }

            });
        }, 100 );
    }
}
