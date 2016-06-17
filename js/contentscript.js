/* global jQuery, chrome, _, Promise */

var $ = jQuery;
var NEXT_TASK_WAIT = 100;
var CAPTURE_DELAY = 150;
var hasStopOrder = false;
var activeTab;

main();

function main() {

    chrome.runtime.onMessage.addListener(function( data, sender, callback ) {

        if ( data.type === 'runTask' ) {

            // We have to clean up last run or waiting connection will not resolve until timeout.
            chrome.runtime.sendMessageAsync({
                type: 'cleanUp'
            }).then( runTasks );
        } else if ( data.type === 'scrollPage' ) {

            getPositions( callback );
            return true;
        } else if ( data.type == 'log' ) {

            console.log( '[LOG]', data.data );
        }

        if ( data.type === 'stopTask' ) {

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

        runningTasks = Array.isArray( selectedJob.tasks ) ? selectedJob.tasks : [];
        selectedJob.tasks = null;

        console.log( 'storage', storage, selectedJob, runningTasks );

        // set index
        runningTasks.forEach(function( v, i ) {

            v.index = i + 1;
        });

        // remove disabled task
        runningTasks = runningTasks.filter(function( v ) {

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
                job: selectedJob,
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

    var job;
    var task;
    var msg = 'End';
    var promise = waitConn().then(function() {

        return chrome.runtime.sendMessageAsync({
            type: 'loadSession'
        }).then(function( res ) {

            job = res.job;

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
            if ( !res.tasks.length ) {

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

        // screenshort
        if ( task.screenshort ) {

            return chrome.runtime.sendMessageAsync({
                type: 'screenshort',
                data: {
                    job: job,
                    task: task
                }
            });
        }

        return null;
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

function max( nums ) {

    return Math.max.apply( Math, nums.filter(function( x ) {

        return x;
    }));
}

function getPositions( callback ) {

    var body = document.body,
        originalBodyOverflowYStyle = body ? body.style.overflowY : '',
        originalX = window.scrollX,
        originalY = window.scrollY,
        originalOverflowStyle = document.documentElement.style.overflow;

    // try to make pages with bad scrolling work, e.g., ones with
    // `body { overflow-y: scroll; }` can break `window.scrollTo`
    if ( body ) {

        body.style.overflowY = 'visible';
    }

    var widths = [
            document.documentElement.clientWidth,
            body ? body.scrollWidth : 0,
            document.documentElement.scrollWidth,
            body ? body.offsetWidth : 0,
            document.documentElement.offsetWidth
        ],
        heights = [
            document.documentElement.clientHeight,
            body ? body.scrollHeight : 0,
            document.documentElement.scrollHeight,
            body ? body.offsetHeight : 0,
            document.documentElement.offsetHeight
        ],
        fullWidth = max( widths ),
        fullHeight = max( heights ),
        windowWidth = window.innerWidth,
        windowHeight = window.innerHeight,
        arrangements = [],

        // pad the vertical scrolling to try to deal with
        // sticky headers, 250 is an arbitrary size
        scrollPad = 200,
        yDelta = windowHeight - ( windowHeight > scrollPad ? scrollPad : 0 ),
        xDelta = windowWidth,
        yPos = fullHeight - windowHeight,
        xPos,
        numArrangements;

    // During zooming, there can be weird off-by-1 types of things...
    if ( fullWidth <= xDelta + 1 ) {

        fullWidth = xDelta;
    }

    // Disable all scrollbars. We'll restore the scrollbar state when we're done
    // taking the screenshots.
    document.documentElement.style.overflow = 'hidden';

    while ( yPos > -yDelta ) {

        xPos = 0;
        while ( xPos < fullWidth ) {

            arrangements.push([xPos, yPos]);
            xPos += xDelta;
        }
        yPos -= yDelta;
    }

    numArrangements = arrangements.length;

    function cleanUp() {

        document.documentElement.style.overflow = originalOverflowStyle;
        if ( body ) {

            body.style.overflowY = originalBodyOverflowYStyle;
        }
        window.scrollTo( originalX, originalY );
    }

    (function processArrangements() {

        if ( !arrangements.length ) {

            cleanUp();
            if ( callback ) {

                callback();
            }
            return;
        }

        var next = arrangements.shift(),
            x = next[0],
            y = next[1];

        window.scrollTo( x, y );

        var data = {
            type: 'capture',
            x: window.scrollX,
            y: window.scrollY,
            complete: ( numArrangements - arrangements.length ) / numArrangements,
            windowWidth: windowWidth,
            totalWidth: fullWidth,
            totalHeight: fullHeight,
            devicePixelRatio: window.devicePixelRatio
        };

        // console.log('>> DATA', JSON.stringify(data, null, 4));

        // Need to wait for things to settle
        window.setTimeout(function() {

            // In case the below callback never returns, cleanup
            var cleanUpTimeout = window.setTimeout( cleanUp, 1250 );

            chrome.runtime.sendMessage( data, function( captured ) {

                window.clearTimeout( cleanUpTimeout );

                // console.log('>> POPUP LOG', captured);

                if ( captured ) {

                    // Move on to capture next arrangement.
                    processArrangements();
                } else {

                    // If there's an error in popup.js, the response value can be
                    // undefined, so cleanup
                    cleanUp();
                }
            });

        }, CAPTURE_DELAY );
    })();
}
