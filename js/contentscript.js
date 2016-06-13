/* global jQuery, chrome, _, Promise */

var $ = jQuery;
var NEXT_TASK_WAIT = 100;
var hasStopOrder = false;
main();

function main() {

    chrome.runtime.onMessage.addListener(function( msg, sender, sendResponse ) {

        var msgType = msg && msg.type;

        if ( msgType === 'runTask' ) {

            // We have to clean up last run or waiting connection will not resolve until timeout.
            chrome.runtime.sendMessageAsync({
                type: 'cleanUp'
            }).then( runTasks );
        }

        if ( msgType === 'stopTask' ) {

            hasStopOrder = true;
        }
    });

    // get short available domain
    chrome.storage.local.getAsync(['shortcutDomains', 'setting']).then(function( storage ) {

        var setting = storage.setting || {};
        var shortcutDomains = storage.shortcutDomains || [];
        var isShortcutAvil = shortcutDomains.find(function( v ) {

            return v === location.hostname;
        }) || false;

        if ( isShortcutAvil && setting.runSelectedKey ) {

            Mousetrap.bind([setting.runSelectedKey], function( e ) {

                // We have to clean up last run or waiting connection will not resolve until timeout.
                chrome.runtime.sendMessageAsync({
                    type: 'cleanUp'
                }).then( runTasks );
            });
        }

        checkNextRun();
    });
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
            type: 'isRunOnload'
        }).then(( res ) => {

            // run on reload
            res && runTasks();
        });
    });
}

function runTasks( options ) {

    var opt = options || {};
    var selectedJob, runningTasks, loopTimes;

    chrome.storage.local.getAsync(['tasks', 'jobs', 'selectedJobId', 'loopTimes']).then(function( storage ) {

        loopTimes = typeof storage.loopTimes !== 'undefined' ? storage.loopTimes : 1;

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

    }).then(function() {

        if ( opt.isLoop ) {

            return chrome.runtime.sendMessageAsync({
                type: 'loadSession'
            }).then(function( res ) {

                loopTimes = res.loopTimes;
                listenAndRun();
            });
        }

        listenAndRun();
    });

    function listenAndRun() {

        loopTimes = loopTimes - 1;

        // set tasks as session
        chrome.runtime.sendMessageAsync({
            type: 'saveSession',
            data: {
                tasks: runningTasks,
                loopTimes: loopTimes
            }
        }).then(function() {

            return setBadge({
                text: 'Run'
            });
        }).then(function() {

            return chrome.runtime.sendMessageAsync({
                type: 'listenConnectionChanged'
            });
        }).then( runNextTask );
    }
}

function runNextTask() {

    var task;
    var msg = 'End';
    var promise = waitConn().then(function() {

        return chrome.runtime.sendMessageAsync({
            type: 'loadSession'
        }).then(function( res ) {

            if ( hasStopOrder ) {

                hasStopOrder = false;
                console.warn( 'Stopped by user' );

                promise.cancel();

                chrome.runtime.sendMessage({
                    type: 'cleanUp'
                });

                return setBadge({ text: 'Stop', color: '#ff0000' }).then(function() {

                    setBadge({ text: '' }, 1000 );
                });
            }

            // no more tasks
            if ( !Array.isArray( res.tasks ) || !res.tasks.length ) {

                promise.cancel();

                if ( res.loopTimes > 0 ) {

                    // still have loop times
                    msg = 'Loop';
                    console.log( 'Loop remain:', res.loopTimes );
                } else {

                    chrome.runtime.sendMessage({
                        type: 'cleanUp'
                    });
                }

                return setBadge({ text: msg }).then(function() {

                    // clear badge
                    setBadge({ text: '' }, 1000 ).then(function() {

                        if ( res.loopTimes > 0 ) {

                            setTimeout(function() {

                                runTasks({ isLoop: true });
                            }, 10 );
                        }
                    });
                });
            }

            task = res.tasks.shift();

            return chrome.runtime.sendMessageAsync({
                type: 'saveSession',
                data: {
                    tasks: res.tasks
                }
            }).then(function() {

                return setBadge({
                    text: res.tasks.length
                });
            });
        });
    }).then(function() {

        // wait process
        return new Promise(function( resolve ) {

            setTimeout( resolve, ( isNaN( +task.wait ) ? 0 : +task.wait ) + NEXT_TASK_WAIT );
        });
    }).then(function() {

        return execTask( task );
    }).then(function() {

        // not return promise
        runNextTask();
        return null;
    }).catch(function() {

        return chrome.runtime.sendMessageAsync({
            type: 'taskFailed'
        }).then(function() {

            return setBadge({ text: 'Fail', color: '#ff0000' }).then(function() {

                // clear badge
                setBadge({ text: '' }, 2000 );
            });
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

            chrome.runtime.sendMessageAsync({
                type: 'getConnection'
            }).then(function( res ) {

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

function setBadge( data, delay ) {

    var _data = {
        color: '#265a88'
    };

    Object.assign( _data, data );

    _data.text = typeof _data.text !== 'string' ? _data.text + '' : _data.text;

    if ( delay ) {

        return new Promise(function( resolve ) {

            setTimeout(function() {

                chrome.runtime.sendMessageAsync({
                    type: 'setBadge',
                    data: _data
                }).then( resolve );
            }, delay );
        });
    }

    return chrome.runtime.sendMessageAsync({
        type: 'setBadge',
        data: _data
    });
}

function inspectBg() {

    return chrome.runtime.sendMessageAsync({
        type: 'inspectBg'
    }).then(function( res ) {

        console.log( 'inspectBg', res );
    });
}
