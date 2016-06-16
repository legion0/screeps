
module.exports = function(grunt) {

    grunt.loadNpmTasks('grunt-screeps');

    grunt.initConfig({
        screeps: {
            options: {
                branch: 'default',
                ptr: false
            },
            dist: {
                src: ['*.js', '!Gruntfile.js']
            }
        }
    });
}
