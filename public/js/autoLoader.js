// Sub-routes that need autoloading
var subRoutes = new Set([
    '/upload/submit',
    // Add more sub-routes as needed
]);

// Helper function to determine the script based on the route segments
function getScriptName(path) {
    // Split path and filter out empty segments
    var segments = path.split("/").filter(Boolean);

    if (segments.length > 1) {
        if (subRoutes.has(path)) {
            // Handle sub-routes manually in Set above
            return 'page' + path.replace(/\//g, '_') + '.js';
        }
    } else if (segments.length === 1) {
        // Handle direct routes automatically
        return 'page_' + segments[0] + '.js';
    }
    // Handle empty route as home
    return 'page_home.js';
}

// Helper function to autoload script into DOM based on script path in public/
function autoLoad(scriptPath) {
    var script = document.createElement('script');
    script.src = scriptPath;
    script.type = 'module'; // Specify that the script is a module
    script.onload = function() {
        console.log(script.src + ' loaded successfully.');
    };
    script.onerror = function() {
        console.log('Error loading script: ' + script.src);
    };
    document.body.appendChild(script);
}

// Determine the script name based on the route and autoload it
autoLoad('/js/' + getScriptName(window.location.pathname));
