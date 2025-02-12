// Sub-routes that need autoloading
var subRoutes = new Set([
    '/upload/submit',
    // Add more sub-routes as needed
]);

// Known patterns for dynamic routes and their corresponding scripts
var dynamicRoutePatterns = [
    { pattern: /^\/mode\/[a-fA-F0-9]{24}$/, script: 'page_mode.js' },
    { pattern: /^\/pat\/[a-fA-F0-9]{24}$/, script: 'page_pat.js' },
    // Add more patterns here as needed
];

// Helper function to determine the script based on the route segments
function getScriptName(path) {
    // Check if path matches any dynamic route pattern
    for (var i = 0; i < dynamicRoutePatterns.length; i++) {
        if (dynamicRoutePatterns[i].pattern.test(path)) {
            return dynamicRoutePatterns[i].script;
        }
    }

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

