/* global jQuery, chrome, _, Promise */

var $ = jQuery;
var NEXT_TASK_WAIT = 100;

main();

function main() {

    chrome.runtime.onMessage.addListener(function( msg, sender, sendResponse ) {

        var msgType = msg && msg.type;

        if ( msgType === 'run-task' ) {

            runTasks();
        }
    });

    // get short availabel domain
    chrome.storage.local.getAsync(['shortcutDomains', 'setting']).then(function( s ) {

        var setting = s.setting || {};
        var shortcutDomains = s.shortcutDomains || [];
        var isShortcutAvil = shortcutDomains.find(function( v ) {

            return v === location.hostname;
        }) || false;

        if ( isShortcutAvil && setting.runSelectedKey ) {

            Mousetrap.bind([setting.runSelectedKey], function( e ) {

                runSelected();
            });
        }

        checkNextRun();
    });
}

function runSelected() {

    runTasks();
}

function checkNextRun() {

    // if tasks still left run next
    chrome.runtime.sendMessageAsync({
        type: 'load-tasks'
    }).then(function( res ) {

        if ( res && Array.isArray( res.tasks ) && res.tasks.length ) {

            runNextTask();
            return;
        }

        chrome.runtime.sendMessageAsync({
            type: 'is-run-onload'
        }).then(( res ) => {

            // run on reload
            res && runTasks();
        });
    });
}

function runTasks() {

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
        }).then( runNextTask );
    });
}

function runNextTask() {

    var task;
    var promise = waitConn().then(function() {

        return chrome.runtime.sendMessageAsync({
            type: 'next-task'
        }).then(function( res ) {

            if ( !res || !res.task ) {

                chrome.runtime.sendMessage({
                    type: 'ignore-connection-changed'
                });
                promise.cancel();
            } else {

                task = res.task;
            }

            return null;
        });
    }).then(function() {

        // wait process
        return new Promise(function( resolve ) {

            setTimeout( resolve, ( isNaN( +task.wait ) ? 0 : +task.wait ) + NEXT_TASK_WAIT );
        });
    }).then(function() {

        return execTask( task );
    }).then(function() {

        runNextTask();
        return null;
    }).catch(function() {

        return chrome.runtime.sendMessage({
            type: 'task-failed'
        });
    });
}

function execTask( task ) {

    var $ele;
    var ele;

    if ( task.type === 'url' ) {

        window.location.href = task.data;
        return end();
    }

    $ele = $( task.selector );
    ele = $ele[0];

    if ( !ele ) {

        console.error( 'Element not found', task );
        return Promise.reject( new Error( 'Element not found' ));
    }

    if ( task.type === 'click' || task.type === 'dblclick' ) {

        ele.dispatchEvent( new MouseEvent( task.type, {
            bubbles: true,
            cancelable: true,
            view: window
        }));

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
