/* global saveAs */
function main() {

    var accept = {
        job: ['jobId', 'jobName', 'tasks'],
        task: ['id', 'disabled', 'name', 'selector', 'type', 'data', 'wait']
    };

    var app = angular.module( 'extApp', [
        'ngAnimate',
        'ui.bootstrap',
        'mgcrea.ngStrap'
    ]);

    app.factory( 'Storage', ['$injector', function( $injector ) {

        var Storage = {};

        Storage.setData = function( setting ) {

            var storage = angular.copy( setting );

            if ( _.isArray( storage.jobs )) {

                storage.jobs = storage.jobs.map(function( v ) {

                    // delete unaccept property
                    return _.pick( v, accept.job );
                });
            }

            return chrome.storage.local.setAsync( storage ).then(function() {

                console.log( 'saved' );
            });
        };

        Storage.getData = function( keys ) {

            keys = angular.isArray( keys ) ? keys : [keys];

            return chrome.storage.local.getAsync( keys );
        };

        return Storage;
    }]);

    app.controller( 'BodyCtrl', ['$scope', '$injector', '$element', function( $scope, $injector, $element ) {

        var $uploadModal;
        var $ = angular.element;
        var $timeout = $injector.get( '$timeout' );
        var $modal = $injector.get( '$modal' );
        var Storage = $injector.get( 'Storage' );
        var scope = $scope;
        var view = window.view = $scope.view = {
            tmplSrc: 'jobs.nghtml',
            scope: $scope,
            status: 'jobs',
            clearHashHost: [],
            jobs: [],
            jobsMapped: {},
            tasks: [],
            types: ['click', 'dblclick', 'html', 'text', 'val', 'url'],
            jobStatus: 'list',
            selectedJob: null,
            inputJobName: '',
            upload: {
                validJobs: [],
                errorJobs: []
            }
        };

        view.status = 'settings';

        $scope.jobChanged = function() {

            Storage.setData({
                jobs: view.jobs
            });
        };

        $scope.selectedJobChange = function() {

            Storage.setData({
                selectedJobId: view.selectedJob.jobId
            });
        };

        $scope.setFocus = function( $event ) {

            $timeout(function() {

                $( $event.target ).siblings( 'input' ).focus();

            }, 10 );
        };

        $scope.newJob = function() {

            view.jobStatus = 'new';

            $timeout(function() {

                $element.find( '#inputJobName' ).focus();
            }, 10 );
        };

        $scope.editJob = function() {

            if ( !view.selectedJob ) {

                return;
            }

            view.jobStatus = 'edit';
            view.inputJobName = view.selectedJob.jobName;

            $timeout(function() {

                $element.find( '#inputJobName' ).focus();
            }, 10 );
        };

        $scope.copyJob = function() {

            var newJob = window.newJob = angular.copy( view.selectedJob );

            newJob.jobId = Common.newId();
            newJob.jobName = namingJob( newJob.jobName );

            newJob.tasks.forEach(function( v ) {

                v.id = Common.newId();
            });

            view.jobs.push( newJob );
            view.selectedJob = newJob;

            $scope.jobChanged();
            $scope.selectedJobChange();
        };

        $scope.updateJob = function() {

            if ( !view.selectedJob ) {

                return;
            }

            view.jobStatus = 'list';
            view.selectedJob.jobName = view.inputJobName;
            view.inputJobName = '';

            $scope.jobChanged();
        };

        $scope.addJob = function() {

            if ( !view.inputJobName ) {

                return;
            }

            view.jobStatus = 'list';

            view.jobs.push({
                jobId: ( new Date()).getTime(),
                jobName: view.inputJobName
            });

            view.inputJobName = '';

            view.selectedJob = view.jobs[view.jobs.length - 1];

            $scope.jobChanged();
            $scope.selectedJobChange();
        };

        $scope.openUpload = function() {

            $uploadModal = $modal({
                scope: $scope,
                container: '#modalContainer',
                templateUrl: 'tmpl/upload.nghtml',
                show: true
            });
        };

        $scope.downloadJobs = function() {

            var blob;
            var jobs = angular.copy( view.jobs );

            jobs = jobs.map(function( v ) {

                return _.pick( v, accept.job );
            });

            blob = new Blob([JSON.stringify( jobs, null, '  ' )], { type: 'text/plain;charset=utf-8' });

            saveAs( blob, 'jobs.json' );
        };

        $scope.uploadJobs = function( options ) {

            var jobs = angular.copy( view.upload.validJobs );

            options = options || {};

            if ( options.replace && !window.confirm( 'All jobs will be replace with uploaded!' )) {

                return;
            }

            if ( options.naming ) {

                jobs.forEach(function( v ) {

                    v.jobName = namingJob( v.jobName );
                });
            }

            if ( options.replace ) {

                view.jobs.length = 0;
                view.jobs = view.jobs.concat( jobs );
                view.selectedJob = view.jobs[0];
            } else {

                view.jobs = view.jobs.concat( jobs );

                view.selectedJob = view.selectedJob || view.jobs[0];
            }

            view.upload.validJobs.length = 0;
            view.upload.errorJobs.length = 0;

            $scope.jobChanged();
            view.selectedJob && $scope.selectedJobChange();

            $uploadModal.hide();
        };

        $scope.deleteJob = function() {

            if ( !view.selectedJob ) {

                return;
            }

            if ( !window.confirm( 'Delete ?' )) {

                return;
            }

            view.jobs = view.jobs.filter(( v ) => {

                return v.jobId !== view.selectedJob.jobId;
            });

            view.selectedJob = view.jobs.length ? view.jobs[0] : null;

            $scope.jobChanged();
            $scope.selectedJobChange();
        };

        $scope.cancelJob = function() {

            view.jobStatus = 'list';
            view.inputJobName = '';
        };

        $scope.addTask = function() {

            var newTask = {
                id: new Date().getTime(),
                name: '',
                selector: '',
                type: 'click',
                wait: 0
            };

            view.selectedJob.tasks = view.selectedJob.tasks || [];

            view.selectedJob.tasks.push( newTask );

            $scope.jobChanged();

            $timeout(() => {

                setSortable();
                $( 'table#tasks-table tr:last td.name input' ).focus();
            }, 10 );
        };

        // function setFocus

        $scope.copyThisTask = function( task ) {

            var index = view.selectedJob.tasks.indexOf( task );
            var newTask = angular.copy( task );

            newTask.id = Common.newId();

            view.selectedJob.tasks.splice( index, 0, newTask );

            $scope.jobChanged();

            $timeout(() => {

                $( 'table#tasks-table tr' ).eq( index + 2 ).find( 'td.name input' ).focus();
            });
        };

        $scope.removeTask = function( task ) {

            view.selectedJob.tasks = view.selectedJob.tasks.filter(( v ) => {

                return task.id !== v.id;
            });

            $scope.jobChanged();
        };

        $scope.copyTasks = function() {

        };

        $scope.clearTasks = function() {

            if ( !window.confirm( 'Clear all ?' )) {

                return;
            }

            view.selectedJob.tasks.length = 0;
            $scope.jobChanged();
            $scope.$applyAsync( setSortable );
        };

        function setSortable() {

            $( '#tasks-table' ).sortable({
                items: 'tr.task-row',
                handle: '.change-order',
                revert: true,
                placeholder: 'bg-warning sortable-placeholder',
                update: sorttableUpdated
            });
        }

        function destroySortable() {

            $( '#tasks-table' ).sortable( 'destroy' );
        }

        function sorttableUpdated( event, ui ) {

            var mapTasks = {};
            var $rows = ui.item.closest( 'tbody' ).find( '.task-row' );
            var sortted = [];

            view.selectedJob.tasks.forEach(( v ) => {

                mapTasks[v.id] = v;
            });

            view.selectedJob.tasks.length = 0;

            $rows.each(function() {

                var $r = $( this );
                var id = $r.data( 'task-id' );

                view.selectedJob.tasks.push( mapTasks[id] );
            });

            $scope.jobChanged();
            $scope.$applyAsync();
        }

        chrome.storage.local.getAsync(['setting', 'jobs', 'tasks', 'selectedJobId', 'shortcutDomains']).then(function( storage ) {

            var setting = storage.setting || {};

            view.clearHashHost = setting.clearHashHost || [];
            view.jobs = storage.jobs || [];
            view.tasks = storage.tasks || [];
            view.shortcutDomains = storage.shortcutDomains || [];

            if ( storage.selectedJobId ) {

                view.selectedJob = view.jobs.find(function( v ) {

                    return v.jobId === storage.selectedJobId;
                });

            }

            if ( !view.selectedJob && view.jobs.length ) {

                view.selectedJob = view.jobs[0];
            }

            $scope.$applyAsync(function() {

                setSortable();
            });
        });

        $scope.$watch( 'view.status', function( newValue, oldValue, scope ) {

            console.log( 'key', newValue, oldValue );

            if ( newValue === 'jobs' ) {

                $scope.$applyAsync(function() {

                    setSortable();
                });
            }

            if ( newValue !== 'jobs' ) {

                destroySortable();
            }

        }, false );

        function namingJob( baseName ) {

            var newName, i = 0;
            baseName = baseName.replace( /-[0-9]+$/, '' );

            while ( !newName ) {

                if ( !view.jobs.find(function( v ) {

                        return v.jobName === baseName + ( i > 1 ? '-' + i : '' );
                    })) {

                    newName = baseName + ( i > 1 ? '-' + i : '' );
                }

                i = i + 1;
            }

            return newName;
        }

        $( document ).on( 'dragover', '#drop_zone', handleDragOver );
        $( document ).on( 'drop', '#drop_zone', handleFileSelect );

        function optimizeJobs( uploads ) {

            var errors = [];
            var jobs = [];

            view.upload.validJobs.length = 0;
            view.upload.errorJobs.length = 0;

            uploads.forEach(function( u ) {

                var job;

                try {

                    // parse data to jobs
                    u.jobs = JSON.parse( u.data );

                } catch ( ex ) {

                    errors.push({
                        file: u.file,
                        error: ex
                    });

                    window.alert( 'Unknow file format. We only support JSON format!' );
                    console.log( 'Upload error:', ex );

                    return;
                }

                u.jobs.forEach(function( j ) {

                    // only accept valid property
                    job = _.pick( j, accept.job );

                    if ( !job.jobName ) {

                        return;
                    }

                    job.jobId = Common.newId();

                    jobs.push( job );
                });
            });

            if ( !jobs.length ) {

                return;
            }

            jobs.forEach(function( j ) {

                var tasks = Array.isArray( j.tasks ) ? j.tasks : [];

                // reset array for clean tasks
                j.tasks = [];

                tasks.forEach(function( t ) {

                    t.id = Common.newId();

                    // only accept valid property
                    j.tasks.push( _.pick( t, accept.task ));
                });
            });

            view.upload.validJobs = jobs;

            $scope.$applyAsync();
        }

        function handleFileSelect( e ) {

            var evt = e.originalEvent || e;

            evt.stopPropagation();
            evt.preventDefault();

            var files = evt.dataTransfer.files; // FileList object.
            var uploads = [];

            for ( var i = 0, f; f = files[i]; i++ ) {

                // if ( f.type !== 'application/json' ) {

                //     return;
                // }

                uploads.push({
                    file: f,
                    data: null
                });

                var reader = new FileReader();

                reader.onload = (function( file ) {

                    return function( e ) {

                        var fo = uploads.find( v => {

                            return v.file.name === file.name;
                        });

                        fo.data = e.target.result;

                        // if all files read let digest loop to handle it
                        if ( !uploads.find( v => {

                                return !v.data;
                            })) {

                            optimizeJobs( uploads );
                        }
                    };
                })( f );

                reader.readAsText( f );
            }
        }

        function handleDragOver( e ) {

            var evt = e.originalEvent || e;

            evt.stopPropagation();
            evt.preventDefault();

            evt.dataTransfer.dropEffect = 'copy';
        }
    }]);

    app.controller( 'SettingsCtrl', ['$scope', '$injector', '$element', function( $scope, $injector, $element ) {

        var Storage = $injector.get( 'Storage' );
        var view = $scope.view = {
            setting: {},
            newShortcutDomain: '',
            jobs: [],
            shortcutDomains: [],
            menuName: 'shortcutDomains'
        };

        $scope.addShortcutDomain = function() {

            view.shortcutDomains.push( view.newShortcutDomain );

            Storage.setData({
                shortcutDomains: view.shortcutDomains
            });

            view.newShortcutDomain = '';
        };

        $scope.removeShortcutDomain = function( index ) {

            view.shortcutDomains.splice( index, 1 );
            Storage.setData({
                shortcutDomains: view.shortcutDomains
            });
        };

        $scope.selectMenu = function( $event, menuName ) {

            view.menuName = menuName;
        };

        $scope.runSelectedKeyChanged = function() {

            Storage.setData({
                setting: view.setting
            });
        };

        Storage.getData(['setting', 'jobs', 'shortcutDomains']).then(function( storage ) {

            view.setting = storage.setting || {};
            view.jobs = storage.jobs || [];
            view.shortcutDomains = storage.shortcutDomains || [];

            view.setting.runSelectedKey = view.setting.runSelectedKey || '';
        });
    }]);
}

main();
