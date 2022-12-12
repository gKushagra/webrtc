const createRoomBtn = document.getElementById('create-room');

// add listener to create room btn
createRoomBtn.addEventListener('click', (event) => {
    const currentRoomId = generateUuid();
    log(currentRoomId);

    // navigate to new room
    var url = new URL(window.location.origin + '/rooms/index.html');
    url.searchParams.append("token", currentRoomId);
    window.location.replace(url);
});

// helper method to generate uuid
function generateUuid() {

    let dt = new Date().getTime();

    const uuid = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
        const r = (dt + Math.random() * 16) % 16 | 0
        dt = Math.floor(dt / 16)
        return (c == 'x' ? r : (r & 0x3 | 0x8)).toString(16)
    });

    return uuid;
}

// helper method to log events
function log(message) {
    console.log(`Client::${new Date()}::${message}`);
}