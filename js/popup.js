/* global chrome, async, jQuery, window, angular, config, common */
var $ = jQuery;
var manifest = chrome.runtime.getManifest();

// var VERSION = manifest.version;
var activeTab, activeHost;

function main() {

    $(function() {

        console.log( 'bring me there!! i am popup' );

        $( '#btnOpenBg' ).click(function( evt ) {

            var bgUrl = chrome.extension.getURL( 'bg.html' );

            evt.preventDefault();

            chrome.tabs.query({
                url: bgUrl
            }, function( tabs ) {

                if ( tabs.length ) {

                    chrome.tabs.update( tabs[0].id, { active: true });
                    return;
                }

                chrome.tabs.create({ url: bgUrl });

            });
        });

        $( '#btnSetClearHash' ).click(function() {

            async.waterfall([
                function() {

                    // load setting from storage
                    chrome.storage.local.get(['setting'], cbFactory( arguments ));
                },
                function( storage ) {

                    var setting = storage.setting;
                    var hosts = $.isArray( setting.clearHashHost ) ? setting.clearHashHost : [];

                    hosts = hosts.filter(function( v ) {

                        return v !== activeHost;
                    });

                    hosts.push( activeHost );

                    chrome.storage.local.set({
                        setting: {
                            clearHashHost: hosts
                        }
                    }, cbFactory( arguments ));
                },
                function() {
                    initView();
                    chrome.storage.local.get(['setting'], cbFactory( arguments ));
                },
                function( setting ) {

                    console.log( 'setting', setting );
                }
            ]);
        });

        $( '#btnStopClearHash' ).click(function() {

            async.waterfall([
                function() {

                    // load setting from storage
                    chrome.storage.local.get(['setting'], cbFactory( arguments ));
                },
                function( storage ) {

                    var setting = storage.setting;
                    var hosts = $.isArray( setting.clearHashHost ) ? setting.clearHashHost : [];

                    hosts = hosts.filter(function( v ) {

                        return v !== activeHost;
                    });

                    chrome.storage.local.set({
                        setting: {
                            clearHashHost: hosts
                        }
                    }, cbFactory( arguments ));
                },
                function() {

                    initView();
                    chrome.storage.local.get(['setting'], cbFactory( arguments ));
                },
                function( setting ) {

                    console.log( 'setting', setting );
                }
            ]);
        });
    });
}

// cache active tab
chrome.tabs.query({
    active: true
}, function( tabs ) {

    if ( !tabs.length ) {

        return;
    }

    activeTab = tabs.length ? tabs[0] : null;
    activeHost = activeTab.url.match( /https?:\/\/[^/]+/ig )[0];

    initView();
    main();
});

function initView() {

    // body...
    async.waterfall([
        function() {

            // load setting from storage
            chrome.storage.local.get(['setting'], cbFactory( arguments ));
        },
        function( storage ) {

            var found;
            var setting = storage.setting;
            var hosts = $.isArray( setting.clearHashHost ) ? setting.clearHashHost : [setting.clearHashHost];

            found = hosts.find(function( v ) {

                return v === activeHost;
            });

            console.log( 'setting', setting, found );

            $( '#btnSetClearHash, #btnStopClearHash' ).addClass('hidden');

            if ( !found ) {

                // set button on
                $( '#btnSetClearHash' ).removeClass( 'hidden' );
            } else {

                $( '#btnStopClearHash' ).removeClass( 'hidden' );
            }
        }
    ]);
}

function cbFactory( args ) {

    var next = args[args.length - 1] || function() {};

    return function( res ) {

        var args = [].slice.call( arguments );

        args.unshift( null );

        next.apply( null, args );
    };
}
