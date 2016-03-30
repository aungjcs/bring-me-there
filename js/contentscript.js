/* global jQuery, chrome, _ */

var runningTasks = [];

(function( $, undefined ) {

    window.addEventListener( 'wrc-extension-resize', function( evt ) {

        var evtData = evt.detail;

        chrome.runtime.sendMessage({
            type: 'updateWindow',
            evtData: evtData
        });

    }, false );

    chrome.runtime.onMessage.addListener(function( msg, sender, sendResponse ) {

        var msgType = msg && msg.type;

        if ( msgType === 'webRequest' ) {

            console.log( 'onMessage', msg );
        }

        if ( msgType === 'some' ) {

            var i = 0;
            while ( i < 5000000 ) {

                i = i + 1;
            }

            console.log( 'ready to response' );

            sendResponse({ msg: 'I got your message.' });
        }

        if ( msgType === 'exec-task' ) {

            chrome.runtime.sendMessage({
                type: 'next-task'
            });

            setTimeout(function() {

                execTask( msg.task );
            }, 1 );
        }

        if ( msgType === 'run-task' ) {

            chrome.storage.local.getAsync( 'tasks' ).then(function( storage ) {

                var tasks = storage.tasks || [];
            });
        }

        if ( msgType === 'connection-changed' ) {

            console.log( 'connection-changed', msg.val );
        }
    });

    function execTask( task ) {

        var $ele = $( task.selector );
        var ele = $ele[0];

        if ( !ele ) {

            console.log( 'Element not found', task );
            return;
        }

        if ( task.type === 'click' ) {

            ele.dispatchEvent( new MouseEvent( 'click' ));

        } else if ( task.type === 'text' ) {

            $ele.val( task.data );

            ele.dispatchEvent( new Event( 'change' ));
        }

        // body...
        console.log( 'task', task );
    }
})( jQuery );

function runTasks( tasks ) {

    runningTasks = tasks;

    // handle for request
    chrome.runtime.sendMessage({
        type: 'listen-connection-changed'
    });
}

function ignore() {

    chrome.runtime.sendMessage({
        type: 'ignore-connection-changed'
    });
}

function waitConn() {

    var defer = jQuery.Deferred();

    conn(function( res ) {

        defer.resolve( res );
    });

    return defer.promise();

    function conn( cb ) {

        setTimeout(function() {

            chrome.runtime.sendMessage({
                type: 'get-connection'
            }, function( res ) {

                var counted = _.countBy( res, function( v ) {

                    return v.state;
                });

                console.log( 'res', counted );

                if ( !counted.before || counted.before.length ) {

                    cb( counted );
                } else {

                    conn( cb );
                }

            });
        }, 500 );
    }
}

function getConn() {

    setTimeout(function() {

        chrome.runtime.sendMessage({
            type: 'get-connection'
        }, function( res ) {

            var counted = _.countBy( res, function( v ) {

                return v.state;
            });

            console.log( 'res', counted );
            getConn();
        });
    }, 500 );
}
