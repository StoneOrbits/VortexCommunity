// Sub-routes that need autoloading
var subRoutes = new Set([
    '/upload/submit',
    // Add more sub-routes as needed
]);

// Known patterns for dynamic routes and their corresponding scripts
var dynamicRoutePatterns = [
    { pattern: /^\/mode\/\d+$/, script: 'page_mode.js' },
    { pattern: /^\/pat\/\d+$/, script: 'page_pat.js' },
    { pattern: /^\/user\/\d+$/, script: 'page_user.js' },
    // Add more patterns here as needed
];

// Helper function to determine the script based on the route segments
function getScriptName(path) {
    // Strip basePath prefix if present
    var bp = window.basePath || '';
    var stripped = path;
    if (bp && path.startsWith(bp)) {
        stripped = path.substring(bp.length) || '/';
    }

    // Check if path matches any dynamic route pattern
    for (var i = 0; i < dynamicRoutePatterns.length; i++) {
        if (dynamicRoutePatterns[i].pattern.test(stripped)) {
            return dynamicRoutePatterns[i].script;
        }
    }

    // Split path and filter out empty segments
    var segments = stripped.split("/").filter(Boolean);

    if (segments.length > 1) {
        if (subRoutes.has(stripped)) {
            // Handle sub-routes manually in Set above
            return 'page' + stripped.replace(/\//g, '_') + '.js';
        }
    } else if (segments.length === 1) {
        // Handle direct routes automatically
        return 'page_' + segments[0] + '.js';
    }

    // Handle empty route as home
    return 'page_home.js';
}

// Determine the script name based on the route and autoload it
var bp = window.basePath || '';
Promise.all([
    import(bp + '/js/' + getScriptName(window.location.pathname)),
    import(bp + '/js/controlPanel.js')
]).catch(function(e) {
    console.error('Error loading scripts:', e);
});

