/* global saveAs */

// Copyright (c) 2012,2013 Peter Coles - http://mrcoles.com/ - All rights reserved.
// Use of this source code is governed by the MIT License found in LICENSE

// Base code is base on https://github.com/mrcoles/full-page-screen-capture-chrome-extension/blob/master/popup.js
// We are forked from https://github.com/mrcoles/full-page-screen-capture-chrome-extension

var Capture = {};

(function() {

    var matches = ['http://*/*', 'https://*/*', 'ftp://*/*', 'file://*/*'],
        noMatches = [/^https?:\/\/chrome.google.com\/.*$/];

    var screenshots,
        resultWindowId,

        // max dimensions based off testing limits of screen capture
        MAX_PRIMARY_DIMENSION = 15000 * 2,
        MAX_SECONDARY_DIMENSION = 4000 * 2,
        MAX_AREA = MAX_PRIMARY_DIMENSION * MAX_SECONDARY_DIMENSION;

    //
    // URL Matching test - to verify we can talk to this URL
    //
    function testURLMatches( url ) {

        // couldn't find a better way to tell if executeScript
        // wouldn't work -- so just testing against known urls
        // for now...
        var r, i;
        for ( i = noMatches.length - 1; i >= 0; i-- ) {

            if ( noMatches[i].test( url )) {

                return false;
            }
        }
        for ( i = matches.length - 1; i >= 0; i-- ) {

            r = new RegExp( '^' + matches[i].replace( /\*/g, '.*' ) + '$' );
            if ( r.test( url )) {

                return true;
            }
        }
        return false;
    }

    Capture.screenshort = function( tab, data, sender, callback ) {

        screenshots = null;

        chrome.tabs.sendMessage( tab.id, { type: 'scrollPage' }, function() {

            // We're done taking snapshots of all parts of the window. Display
            // the resulting full screenshot images in a new browser tab.

            openPage( data.data || {} );
            callback();
        });
    };

    Capture.capture = function( data, sender, callback ) {

        // done
        var done = parseInt( data.complete * 100, 10 );

        // $( 'bar' ).style.width = parseInt( data.complete * 100, 10 ) + '%';

        Common.log( 'capture done ' + done + '%' );

        chrome.tabs.captureVisibleTab( null, { format: 'png', quality: 100 }, function( dataURI ) {

            if ( dataURI ) {

                var image = new Image();
                image.onload = function() {

                    data.image = { width: image.width, height: image.height };

                    // given device mode emulation or zooming, we may end up with
                    // a different sized image than expected, so let's adjust to
                    // match it!
                    if ( data.windowWidth !== image.width ) {

                        var scale = image.width / data.windowWidth;
                        data.x *= scale;
                        data.y *= scale;
                        data.totalWidth *= scale;
                        data.totalHeight *= scale;
                    }

                    // lazy initialization of screenshot canvases (since we need to wait
                    // for actual image size)
                    if ( !screenshots ) {

                        screenshots = _initScreenshots( data.totalWidth, data.totalHeight );
                        if ( screenshots.length > 1 ) {

                            // show( 'split-image' );
                            // $( 'screenshot-count' ).innerText = screenshots.length;
                        }
                    }

                    // draw it on matching screenshot canvases
                    _filterScreenshots(
                        data.x, data.y, image.width, image.height, screenshots
                    ).forEach(function( screenshot ) {

                        screenshot.ctx.drawImage(
                            image,
                            data.x - screenshot.left,
                            data.y - screenshot.top
                        );
                    });

                    // send back log data for debugging (but keep it truthy to
                    // indicate success)
                    callback( JSON.stringify( data, null, 4 ) || true );
                };
                image.src = dataURI;
            }
        });
    };

    function _initScreenshots( totalWidth, totalHeight ) {

        // Create and return an array of screenshot objects based
        // on the `totalWidth` and `totalHeight` of the final image.
        // We have to account for multiple canvases if too large,
        // because Chrome won't generate an image otherwise.
        //
        var badSize = ( totalHeight > MAX_PRIMARY_DIMENSION ||
                totalWidth > MAX_PRIMARY_DIMENSION ||
                totalHeight * totalWidth > MAX_AREA ),
            biggerWidth = totalWidth > totalHeight,
            maxWidth = ( !badSize ? totalWidth :
                ( biggerWidth ? MAX_PRIMARY_DIMENSION : MAX_SECONDARY_DIMENSION )),
            maxHeight = ( !badSize ? totalHeight :
                ( biggerWidth ? MAX_SECONDARY_DIMENSION : MAX_PRIMARY_DIMENSION )),
            numCols = Math.ceil( totalWidth / maxWidth ),
            numRows = Math.ceil( totalHeight / maxHeight ),
            row, col, canvas, left, top;

        var canvasIndex = 0;
        var result = [];

        for ( row = 0; row < numRows; row++ ) {

            for ( col = 0; col < numCols; col++ ) {

                canvas = document.createElement( 'canvas' );
                canvas.width = ( col == numCols - 1 ? totalWidth % maxWidth || maxWidth : maxWidth );
                canvas.height = ( row == numRows - 1 ? totalHeight % maxHeight || maxHeight : maxHeight );

                left = col * maxWidth;
                top = row * maxHeight;

                result.push({
                    canvas: canvas,
                    ctx: canvas.getContext( '2d' ),
                    index: canvasIndex,
                    left: left,
                    right: left + canvas.width,
                    top: top,
                    bottom: top + canvas.height
                });

                canvasIndex++;
            }
        }

        return result;
    }

    function _filterScreenshots( imgLeft, imgTop, imgWidth, imgHeight, screenshots ) {

        // Filter down the screenshots to ones that match the location
        // of the given image.
        //
        var imgRight = imgLeft + imgWidth,
            imgBottom = imgTop + imgHeight;
        return screenshots.filter(function( screenshot ) {

            return ( imgLeft < screenshot.right &&
                imgRight > screenshot.left &&
                imgTop < screenshot.bottom &&
                imgBottom > screenshot.top );
        });
    }

    function openPage( data, screenshotIndex ) {

        // Create an image blob and open in a new tab.
        // If multiple screenshots, then loop through each,
        // opening the final one.
        //
        // Also, standard dataURI can be too big, let's blob instead
        // http://code.google.com/p/chromium/issues/detail?id=69227#c27
        //
        screenshotIndex = screenshotIndex || 0;

        if ( !screenshots ) {

            // show( 'uh-oh' );
            Common.log( 'No screenshots.' );
            return;
        }

        var dataURI = screenshots[screenshotIndex].canvas.toDataURL();
        var last;

        // convert base64 to raw binary data held in a string
        // doesn't handle URLEncoded DataURIs
        var byteString = atob( dataURI.split( ',' )[1] );

        // separate out the mime component
        var mimeString = dataURI.split( ',' )[0].split( ':' )[1].split( ';' )[0];

        // write the bytes of the string to an ArrayBuffer
        var ab = new ArrayBuffer( byteString.length );
        var ia = new Uint8Array( ab );
        for ( var i = 0; i < byteString.length; i++ ) {

            ia[i] = byteString.charCodeAt( i );
        }

        // create a blob for writing to a file
        var blob = new Blob([ab], { type: mimeString });

        var name = 'screencapture-' + Date.now() + '.png';

        // if ( name ) {

        //     name = name
        //         .replace( /^https?:\/\//, '' )
        //         .replace( /[^A-z0-9]+/g, '-' )
        //         .replace( /-+/g, '-' )
        //         .replace( /^[_\-]+/, '' )
        //         .replace( /[_\-]+$/, '' );
        //     name = '-' + name;
        // } else {

        //     name = '';
        // }

        // build name with job and task data
        if ( data.job ) {

            name = [
                data.job.jobName,
                data.task.index,
                data.task.name || 'no_name',
                Date.now()
            ].join( '-' ) + '.png';
        }

        saveAs( blob, name );

        last = screenshotIndex === screenshots.length - 1;

        if ( !last ) {

            openPage( data, screenshotIndex + 1 );
        }
    }
})();
