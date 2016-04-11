var $ = jQuery;
var manifest = chrome.runtime.getManifest();

// var VERSION = manifest.version;
var activeTab, activeHost;
var jobs;

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
        Common.openTab( chrome.runtime.getURL( 'options.html' ));
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

    $( '#jobs' ).on( 'change', function() {

        chrome.storage.local.set({
            selectedJobId: +$( this ).val()
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

    chrome.storage.local.getAsync(['setting', 'jobs', 'selectedJobId']).then(function( storage ) {

        var found;
        var setting = storage.setting || {};
        var hosts = $.isArray( setting.clearHashHost ) ? setting.clearHashHost : [setting.clearHashHost];

        jobs = storage.jobs || [];

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

        storage.jobs.forEach(function( v ) {

            $( '#jobs' ).append( new Option( v.jobName, v.jobId ));
        });

        if ( storage.selectedJobId ) {

            $( '#jobs' ).val( storage.selectedJobId );
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
