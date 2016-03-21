/*global common */

var clearHashHosts = [];
var handleRequestTypes = ['main_frame', 'sub_frame', 'xmlhttprequest'];
var app = angular.module( 'extApp', []);
var jobs = [];

handleRequestTypes = ['main_frame', 'sub_frame', 'xmlhttprequest'];
app.controller( 'BodyCtrl', ['$scope', '$injector', function( $scope, $injector ) {

    $scope.jobs = jobs;

    $scope.$on( 'jobs:changed', function( event, details ) {

        // console.log( 'details', details );

        $scope.$applyAsync();
    });
}]);

app.run(['$rootScope', '$injector', function( $rootScope, $injector ) {

    // web request
    chrome.webRequest.onBeforeRequest.addListener(function( details ) {

        updateJobs({ id: details.requestId, state: 'before', type: 'wreq' }, details );
        $rootScope.$broadcast( 'jobs:changed', details );
    }, {
        urls: ['<all_urls>'],
        types: handleRequestTypes
    });

    chrome.webRequest.onCompleted.addListener(function( details ) {

        updateJobs({ id: details.requestId, state: 'complete', type: 'wreq' }, details );
        $rootScope.$broadcast( 'jobs:changed', details );
    }, {
        urls: ['<all_urls>'],
        types: handleRequestTypes
    });

    chrome.webRequest.onErrorOccurred.addListener(function( details ) {

        updateJobs({ id: details.requestId, state: 'error', type: 'wreq' }, details );
        $rootScope.$broadcast( 'jobs:changed', details );
    }, {
        urls: ['<all_urls>'],
        types: handleRequestTypes
    });

    // web navigation
    chrome.webNavigation.onBeforeNavigate.addListener(function( details ) {

        updateJobs({ id: details.processId, state: 'before', type: 'navi' }, details );
        $rootScope.$broadcast( 'jobs:changed', details );
    }, {
        urls: ['<all_urls>']
    });

    chrome.webNavigation.onCompleted.addListener(function( details ) {

        updateJobs({ id: details.processId, state: 'complete', type: 'navi' }, details );
        $rootScope.$broadcast( 'jobs:changed', details );
    }, {
        urls: ['<all_urls>']
    });

    chrome.webNavigation.onErrorOccurred.addListener(function( details ) {

        updateJobs({ id: details.processId, state: 'error', type: 'navi' }, details );
        $rootScope.$broadcast( 'jobs:changed', details );
    }, {
        urls: ['<all_urls>']
    });

    function updateJobs( options, details ) {

        var key, id, job;

        id = options.id;
        key = id + '_' + options.type + '_' + details.tabId + '_' + details.frameId;

        if ( options.state === 'before' ) {

            jobs.unshift({
                key: key,
                id: id,
                state: options.state,
                type: options.type,
                details: details
            });
        } else {

            job = jobs.find(function( v ) {

                return v.key === key;
            });

            if ( job ) {

                job.state = options.state;
            }
        }
    }
}]);

chrome.storage.local.get( 'setting', function( storage ) {

    // load clear hosts
    clearHashHosts = storage.setting.clearHashHost || [];
});

function sendMsg( msg ) {

    chrome.tabs.query({
        active: true,
        currentWindow: true
    }, function( tabs ) {

        chrome.tabs.sendMessage( tabs[0].id, msg, function( response ) {

            console.log( response );
        });
    });
}

chrome.runtime.onMessage.addListener(function( request, sender, sendResponse ) {

    if ( request.type === 'updateWindow' && request.evtData ) {

        // updateWindow( request.evtData );
    }
});

chrome.runtime.onInstalled.addListener(function() {

});

chrome.runtime.onStartup.addListener(function() {

    // ブラウザ起動時に呼ばれる
});

chrome.storage.onChanged.addListener(function( changed ) {

    clearHashHosts = changed.setting.newValue.clearHashHost;
});

/*
chrome.webRequest.onBeforeRequest.addListener(
    function( details ) {

        if ( details.url.indexOf( 'http://reload.extensions' ) >= 0 ) {

            reloadExtensions();
            chrome.tabs.get( details.tabId, function( tab ) {

                if ( tab.selected === false ) {

                    chrome.tabs.remove( details.tabId );
                }
            });
            return {

                // close the newly opened window
                redirectUrl: chrome.extension.getURL( 'close.html' )
            };
        }

        return { cancel: false };
    }, {
        urls: ['http://reload.extensions/'],
        types: ['main_frame']
    }, ['blocking']
);*/

chrome.runtime.onStartup.addListener(function() {

    console.log( 'startup' );

    // chrome.tabs.create({ url: chrome.extension.getURL( 'bg.html' ) });
});

chrome.management.onEnabled.addListener(function() {

    console.log( 'onEnabled', arguments );

    chrome.tabs.create({ url: chrome.extension.getURL( 'bg.html' ) });
});

chrome.webRequest.onBeforeRequest.addListener(function( details ) {

    // console.log( 'onBeforeRequest', details );

    var url = details.url;
    var redirect;

    if ( clearHashHosts.length && url.match( /#.*$/ig )) {

        clearHashHosts.forEach(function( u ) {

            if ( url.indexOf( u ) >= 0 ) {

                messageToActiveTab({
                    type: 'webRequest',
                    data: details
                });

                if ( !redirect ) {

                    redirect = {
                        redirectUrl: url.match( /^[^#]+/ig )[0]
                    };
                }
            }
        });
    }

    return redirect || { cancel: false };
}, {
    urls: ['<all_urls>'],
    types: ['main_frame']
}, ['blocking']);

// chrome.webRequest.onBeforeRequest.addListener(function( details ) {

//     // console.log( 'onBeforeRequest', details );

//     var url = details.url;

//     if ( url.match( /#.*$/ig )) {

//         messageToActiveTab( details );
//         return {
//             redirectUrl: url.match( /^[^#]+/ig )[0]
//         };
//     }

//     return { cancel: false };
// }, {
//     urls: ['*://localhost:*/*'],
//     types: ['main_frame']
// }, ['blocking']);

chrome.webRequest.onBeforeRequest.addListener(function( details ) {

    console.log( 'wr onBeforeRequest', details.requestId, details.tabId, details.frameId );

    // messageToActiveTab({
    //     type: 'webRequest',
    //     data: details
    // });

    return { cancel: false };
}, {
    urls: ['<all_urls>'],
    types: handleRequestTypes
});

chrome.webRequest.onCompleted.addListener(function( details ) {

    console.log( 'wr onCompleted', details.requestId, details.tabId, details.frameId );

    // messageToActiveTab({
    //     type: 'webRequest',
    //     data: details
    // });

    return { cancel: false };
}, {
    urls: ['<all_urls>'],
    types: handleRequestTypes
});

chrome.webNavigation.onBeforeNavigate.addListener(function( details ) {

    console.log( 'navi onBeforeNavigate', details.processId, details.tabId, details.frameId );
}, {
    urls: ['<all_urls>']
});

chrome.webNavigation.onCompleted.addListener(function( details ) {

    console.log( 'navi onCompleted', details.processId, details.tabId, details.frameId );
}, {
    urls: ['<all_urls>']
});

chrome.runtime.onInstalled.addListener(function( details ) {

    // messageToActiveTab( details );
});

function messageToActiveTab( msg ) {

    chrome.tabs.query({
        pinned: true
    }, function( tabs ) {

        chrome.tabs.sendMessage( tabs[0].id, msg, function( res ) {

            console.log( 'res from cs', res );
        });
    });
}

console.log( 'i am bg' );
