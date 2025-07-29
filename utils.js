// Utility Functions

function randomInt(a, b) {
    return Math.floor(Math.random() * (b - a + 1)) + a;
}

function clamp(val, min, max) {
    return Math.max(min, Math.min(val, max));
}

function circleRectCollide(cx, cy, cr, rx, ry, rw, rh) {
    // Collides circle with rectangle
    let closestX = clamp(cx, rx, rx+rw);
    let closestY = clamp(cy, ry, ry+rh);
    let dx = cx - closestX;
    let dy = cy - closestY;
    return (dx*dx + dy*dy) <= cr*cr;
}