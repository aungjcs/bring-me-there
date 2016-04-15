/* global jQuery, chrome, _, Promise */

var $ = jQuery;
var NEXT_TASK_WAIT = 100;

chrome.runtime.onMessage.addListener(function( msg, sender, sendResponse ) {

    var msgType = msg && msg.type;

    if ( msgType === 'webRequest' ) {

        console.log( 'onMessage', msg );
    }

    if ( msgType === 'run-task' ) {

        chrome.storage.local.get(['tasks', 'jobs', 'selectedJobId'], function( storage ) {

            var selectedJob, runningTasks;

            if ( !storage.jobs || !storage.jobs.length ) {

                return;
            }

            selectedJob = storage.jobs.find(function( v ) {

                return v.jobId === storage.selectedJobId;
            });

            // remove disabled task
            runningTasks = ( selectedJob.tasks || []).filter(function( v ) {

                return !v.disabled;
            });

            chrome.runtime.sendMessageAsync({
                type: 'save-running-tasks',
                data: runningTasks
            }).then(function() {

                return chrome.runtime.sendMessageAsync({
                    type: 'listen-connection-changed'
                });
            }).then( runTasks );
        });
    }
});

// if tasks still run next
chrome.runtime.sendMessageAsync({
    type: 'load-tasks'
}).then(function( res ) {

    if ( res && Array.isArray( res.tasks ) && res.tasks.length ) {

        console.log('gonna run next', log);

        runTasks();
    }
});

function runTasks() {

    var wait, nextTask;

    return chrome.runtime.sendMessageAsync({
        type: 'next-task'
    }).then(function( res ) {

        var task = res.task;

        if ( !task ) {

            chrome.runtime.sendMessage({
                type: 'ignore-connection-changed'
            });
            return null;
        }

        return waitConn().then(function( res ) {

            // wait process
            return new Promise(function( resolve ) {

                setTimeout( resolve, ( isNaN( +task.wait ) ? 0 : +task.wait ) + NEXT_TASK_WAIT );
            });
        }).then(function() {

            return execTask( task ).then( runTasks ).catch(function() {

                return chrome.runtime.sendMessage({
                    type: 'task-failed'
                });
            });
        });

        // execTask( task ).then(function() {

        //     if ( runningTasks.length ) {

        //         nextTask = runningTasks[0];
        //         wait = ( isNaN( +nextTask.wait ) ? 0 : +nextTask.wait ) + NEXT_TASK_WAIT;

        //         waitConn().then(function() {

        //             _.delay( runTasks, wait );
        //         });
        //     } else {

        //         chrome.runtime.sendMessage({
        //             type: 'ignore-connection-changed'
        //         });
        //     }
        // });
    });

}

function execTask( task ) {

    var $ele = $( task.selector );
    var ele = $ele[0];

    if ( task.type === 'url' ) {

        window.location.href = task.data;
        return end();
    }

    if ( !ele ) {

        console.error( 'Element not found', task );
        return Promise.reject( 'Element not found' );
    }

    if ( task.type === 'click' ) {

        ele.dispatchEvent( new MouseEvent( 'click' ));

    } else if ( task.type === 'val' ) {

        $ele.val( task.data );

        ele.dispatchEvent( new Event( 'change' ));
    } else if ( task.type === 'text' ) {

        $ele.text( task.data );
    } else if ( task.type === 'html' ) {

        $ele.html( task.data );
    }

    return end();

    function end() {

        return new Promise(function( resolve ) {

            setTimeout(function() {

                resolve();
            }, 1 );
        });
    }
}

function waitConn() {

    return new Promise(function( resolve, reject ) {

        conn(function( res ) {

            // console.warn( 'wait conn resolved.' );

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
