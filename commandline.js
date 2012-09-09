var CommandLine = {
    $input: null,
    $popup: null,
    $blocker: null,
    visible: false,
    selectedSuggestionIndex: null,
    suggestions: [],

    commands: {
        "w": {
            hideCommandLine: true,
            fn: function(args) {
                save(getCurrentlySelectedFileName(), getLinesInCurrentBuffer());
            }
        },
        "grep": {
            hideCommandLine: false,
            fn: function(args) {
                var q = args.join(' ');
                CommandLine.grep(q);
            }
        }
    },

    init: function() {
        var self = this;
        self.$popup = document.querySelector('.popup.command-line');
        self.$input = document.querySelector('.popup.command-line input');
        self.$suggestions= document.querySelector('.popup.command-line ul');
        self.$blocker = document.querySelector('#blocker');

        self.$input.onkeyup = function(event) {
            if (event.keyCode === 27) {
                self.hide();
            } else if (event.ctrlKey && event.keyCode === 78) {
                self.navigateSuggestionDown();
                event.stopPropagation();
            } else if (event.ctrlKey && event.keyCode === 80) {
                self.navigateSuggestionUp();
                event.stopPropagation();
            } else if (event.keyCode === 17) {
                // do nothing, it was just the ctrl key lifted up
            } else if (event.keyCode !== 13 && this.value[0] !== ':' && this.value[0] !== '/' && this.value[0] !== '?') {
                self.getAutoCompleteSuggestions(this.value);
            } else if (event.keyCode === 13) {
                if (this.value[0] === ":") {
                    var cmd = this.value.split(":")[1];
                    var split = cmd.split(' ');
                    var cmd = split.splice(0, 1);
                    var args = split;
                    if (isNumeric(cmd)) {
                        editor.gotoLine(cmd);
                        self.hide();
                    } else {
                        self.runCommand(cmd, args);
                    }
                } else if (this.value[0] === "/") {
                    var needle = this.value.split('/')[1];
                    editor.find(needle);
                    self.hide();
                } else if (this.value[0] === "?") {
                    var needle = this.value.split('?')[1];
                    editor.findPrevious(needle);
                    self.hide();
                } else {
                    self.openSelectedSuggestion();
                }
            }
        }
    },

    navigateSuggestionDown: function() {
        if (this.selectedSuggestionIndex === null) {
            this.selectedSuggestionIndex = 0;
            addClass(this.suggestionElements[this.selectedSuggestionIndex], 'hover');
        } else if (this.selectedSuggestionIndex < this.suggestionElements.length - 1) {
            removeClass(this.suggestionElements[this.selectedSuggestionIndex], 'hover');
            this.selectedSuggestionIndex += 1;
            addClass(this.suggestionElements[this.selectedSuggestionIndex], 'hover');
        }
    },

    navigateSuggestionUp: function() {
        if (this.selectedSuggestionIndex !== null && this.selectedSuggestionIndex > 0) {
            removeClass(this.suggestionElements[this.selectedSuggestionIndex], 'hover');
            this.selectedSuggestionIndex -= 1;
            addClass(this.suggestionElements[this.selectedSuggestionIndex], 'hover');
        }
    },

    openSelectedSuggestion: function() {
        this.suggestionElements[this.selectedSuggestionIndex].onclick();
    },

    getAutoCompleteSuggestions: function(s) {
        var self = this;
        var i = 0;
        var suggestions = getAutoSuggestions(s);
        self.suggestionElements = [];
        self.selectedSuggestionIndex = null;

        var onFileClick = function() {
            self.hide();
            fileClicked(this);
        };

        self.$suggestions.innerHTML = '';

        if (s.length && suggestions.length) {
            var fragment = document.createDocumentFragment();
            suggestions.forEach(function(file, i) {
                var li = createFileListView(file, null, onFileClick);
                fragment.appendChild(li);
                self.suggestionElements.push(li);
            });
            self.$suggestions.appendChild(fragment);
            self.$suggestions.style.display = 'block';
        } else {
            self.$suggestions.style.display = 'none';
        }
    },

    grep: function(q) {
        var self = this;
        var xhr = new XMLHttpRequest();

        var onFileClick = function() {
            self.hide();
            fileClicked(this);
        };

        self.suggestionElements = [];
        self.selectedSuggestionIndex = null;
        self.$suggestions.innerHTML = '';
        self.$input.setAttribute('disabled');

        if (!q) {
            return;
        }

        xhr.open("GET", '/grep?q=' + encodeURIComponent(q));

        xhr.onreadystatechange = function() {
            if (xhr.readyState == 4) {
                try {
                    var json = JSON.parse(xhr.responseText);
                } catch (e) {
                    console.log('Could not parse grep response');
                    return;
                }

                if (json.length) {
                    var fragment = document.createDocumentFragment();
                    json.forEach(function(file, i) {
                        var li = createFileListView(file.filename, file.lineno, onFileClick);
                        fragment.appendChild(li);
                        self.suggestionElements.push(li);
                    });
                    self.$suggestions.appendChild(fragment);
                    self.$suggestions.style.display = 'block';
                } else {
                    self.$suggestions.style.display = 'none';
                }
                self.$input.removeAttribute('disabled');
            }
        };

        xhr.send();
    },

    runCommand: function(cmd, args) {
        var self = this;
        if (this.commands.hasOwnProperty(cmd)) {
            var command = this.commands[cmd];
            command.fn(args);
            if (command.hideCommandLine) {
                self.hide();
            }
        } else {
            throw "Unknown command '" + cmd + "'";
        }
    },

    isVisible: function() {
        return this.$popup.style.display === 'block';
    },

    show: function(startingChar) {
        var self = this;

        self.$blocker.onclick = function() {
            self.hide();
        };

        self.$input.value = startingChar;
        self.$suggestions.innerHTML = '';
        self.$suggestions.style.display = 'none';
        self.$popup.style.display = 'block';
        self.$blocker.style.display = 'block';

        // Focusing on text input right away does not work for some reason.
        setTimeout(function() {
            editor.blur();
            self.$input.focus();
        }, 100);
    },

    hide: function() {
        var self = this;
        self.$popup.style.display = 'none';
        self.$blocker.style.display = 'none';
        editor.focus();
    }
}
