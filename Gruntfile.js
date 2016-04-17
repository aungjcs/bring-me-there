module.exports = function( grunt ) {

    grunt.loadNpmTasks( 'grunt-contrib-compress' );

    function init( params ) {

        grunt.initConfig({
            pkg: grunt.file.readJSON( 'package.json' ),
            compress: {
                main: {
                    options: {
                        archive: 'dist/<%= pkg.name %>-<%= pkg.version %>.zip',
                        mode: 'zip'
                    },
                    src: [
                        'css/**/*',
                        'img/**/*.png',
                        'js/**/*.js',
                        '*.html',
                        'manifest.json'
                    ]
                }
            }
        });

        grunt.registerTask( 'version', 'set version', function() {

            var manifest = grunt.file.readJSON( 'manifest.json' );

            manifest.version = grunt.config( 'pkg.version' );

            grunt.file.write( 'manifest.json', JSON.stringify( manifest, null, '  ' ) );
        });

        grunt.registerTask( 'default', ['version', 'compress']);
    }

    init({});

};
