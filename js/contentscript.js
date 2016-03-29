/* global jQuery, chrome */

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
        } else if ( msgType === 'some' ) {

            var i = 0;
            while ( i < 5000000 ) {

                i = i + 1;
            }

            console.log( 'ready to response' );

            sendResponse({ msg: 'I got your message.' });
        } else if ( msgType === 'exec-task' ) {

            chrome.runtime.sendMessage({
                type: 'next-task'
            });

            setTimeout( function() {

                execTask( msg.task );
            }, 1 );
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
