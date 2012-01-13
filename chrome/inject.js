var isEditorShowing;

window.addEventListener('keyup', function(event) {
    if (event.keyCode === 69) { // 'e' 
        injectEditor();
    }
});

function injectEditor() {
    document.querySelector('body').style.background = 'red';
}

function removeEditor() {
    document.querySelector('body').style.background = 'white';
}
