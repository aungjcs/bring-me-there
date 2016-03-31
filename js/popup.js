/* global chrome, async, jQuery, window, angular, config, Promise, Common */
var $ = jQuery;
var manifest = chrome.runtime.getManifest();

// var VERSION = manifest.version;
var activeTab, activeHost;

function main() {

    console.log( 'bring me there!! i am popup' );

    $( '#btnOpenBg' ).click(function( evt ) {

        evt.preventDefault();
        Common.openTab( chrome.extension.getURL( 'bg.html' ));
    });

    // open options page
    $( '#btnOpenOption' ).click(function( evt ) {

        if ( chrome.runtime.openOptionsPage ) {

            // New way to open options pages, if supported (Chrome 42+).
            // chrome.runtime.openOptionsPage();
        } else {

            // Reasonable fallback.
        }
        window.open( chrome.runtime.getURL( 'options.html' ));
    });

    $( '#btnSetClearHash' ).click(function() {

        updateHostClearHash({ add: true }).then( initView );
    });

    $( '#btnStopClearHash' ).click(function() {

        updateHostClearHash({ clear: true }).then( initView );
    });

    $( '#btnRunTasks' ).click(function() {

        Common.messageToTab({ active: true }, { type: 'run-task' }).then(function() {

            window.close();
        });
    });
}

function updateHostClearHash( option ) {

    option = option || {};

    if ( !activeHost ) {

        return Promise.reject( 'Your are opening not https? page. Maybe chrome-extension ?' );
    }

    return chrome.storage.local.getAsync(['setting']).then(function( storage ) {

        var setting = storage.setting || {};
        var hosts = $.isArray( setting.clearHashHost ) ? setting.clearHashHost : [];

        hosts = hosts.filter(function( v ) {

            return v !== activeHost;
        });

        if ( option.add === true ) {

            hosts.push( activeHost );
        }

        return chrome.storage.local.setAsync({
            setting: {
                clearHashHost: hosts
            }
        });
    });
}

function initView() {

    chrome.storage.local.getAsync(['setting']).then(function( storage ) {

        var found;
        var setting = storage.setting || {};
        var hosts = $.isArray( setting.clearHashHost ) ? setting.clearHashHost : [setting.clearHashHost];

        found = hosts.find(function( v ) {

            return v === activeHost;
        });

        $( '#btnSetClearHash, #btnStopClearHash' ).addClass( 'hidden' );

        if ( activeHost ) {

            if ( !found ) {

                // set button on
                $( '#btnSetClearHash' ).removeClass( 'hidden' );
            } else {

                $( '#btnStopClearHash' ).removeClass( 'hidden' );
            }
        }
    });
}

// cache active tab
chrome.tabs.queryAsync({ active: true }).then(function( tabs ) {

    if ( !tabs.length ) {

        return;
    }

    activeTab = tabs.length ? tabs[0] : null;
    activeHost = activeTab.url.match( /https?:\/\/[^/]+/ig );
    activeHost = activeHost ? activeHost[0] : null;

    initView();
    main();
});
