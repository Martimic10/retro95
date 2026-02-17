const NOTES_KEY = 'retro95_notes_v1';

function loadNotes() {
    try {
        const parsed = JSON.parse(localStorage.getItem(NOTES_KEY) || '[]');
        if (!Array.isArray(parsed)) return [];
        return parsed;
    } catch (_error) {
        return [];
    }
}

function saveNotes(notes) {
    localStorage.setItem(NOTES_KEY, JSON.stringify(notes));
}

function createNote() {
    return {
        id: `note_${Date.now()}_${Math.floor(Math.random() * 10000)}`,
        title: 'Untitled note',
        content: '',
        updatedAt: Date.now()
    };
}

function displayTitle(note) {
    const firstLine = (note.content || '').split('\n')[0].trim();
    return firstLine || note.title || 'Untitled note';
}

const notesApp = {
    id: 'notes',
    name: 'Notes',
    desktopName: 'Notes',
    icon: '📝',
    defaultSize: { w: 620, h: 420 },
    singleInstance: false,
    createWindowContent({ state, setState, os }) {
        const wrap = document.createElement('div');
        wrap.style.height = '100%';
        wrap.style.display = 'flex';
        wrap.style.gap = '8px';

        const sidebar = document.createElement('div');
        sidebar.style.width = '170px';
        sidebar.style.display = 'flex';
        sidebar.style.flexDirection = 'column';
        sidebar.style.gap = '6px';

        const newBtn = document.createElement('button');
        newBtn.className = 'btn';
        newBtn.textContent = 'New Note';

        const list = document.createElement('div');
        list.style.flex = '1';
        list.style.overflow = 'auto';
        list.style.background = 'white';
        list.style.border = '2px solid';
        list.style.borderColor = '#808080 #dfdfdf #dfdfdf #808080';
        list.style.padding = '4px';

        const editorWrap = document.createElement('div');
        editorWrap.style.flex = '1';
        editorWrap.style.display = 'flex';
        editorWrap.style.flexDirection = 'column';
        editorWrap.style.gap = '6px';

        const titleLine = document.createElement('div');
        titleLine.className = 'label';
        titleLine.textContent = 'Note';

        const textarea = document.createElement('textarea');
        textarea.className = 'notes-textarea';
        textarea.placeholder = 'Type your note...';

        let notes = loadNotes();
        if (!notes.length) {
            notes = [createNote()];
            saveNotes(notes);
        }

        let selectedId = state.selectedId && notes.some((n) => n.id === state.selectedId)
            ? state.selectedId
            : notes[0].id;

        function getSelected() {
            return notes.find((n) => n.id === selectedId) || null;
        }

        function persist() {
            saveNotes(notes);
            setState({ selectedId });
        }

        function renderList() {
            list.innerHTML = '';
            notes
                .slice()
                .sort((a, b) => b.updatedAt - a.updatedAt)
                .forEach((note) => {
                    const item = document.createElement('button');
                    item.type = 'button';
                    item.className = 'menu-item';
                    item.style.width = '100%';
                    item.style.marginBottom = '2px';
                    item.style.padding = '4px';
                    item.style.border = '1px solid transparent';
                    item.style.justifyContent = 'flex-start';
                    item.style.color = '#000';
                    item.style.background = note.id === selectedId ? '#000080' : 'transparent';
                    if (note.id === selectedId) item.style.color = '#fff';
                    item.textContent = displayTitle(note).slice(0, 32);
                    item.addEventListener('click', () => {
                        selectedId = note.id;
                        render();
                    });
                    list.appendChild(item);
                });
        }

        function renderEditor() {
            const note = getSelected();
            if (!note) {
                textarea.value = '';
                titleLine.textContent = 'Note';
                return;
            }
            textarea.value = note.content || '';
            titleLine.textContent = displayTitle(note);
        }

        function render() {
            renderList();
            renderEditor();
        }

        newBtn.addEventListener('click', () => {
            const note = createNote();
            notes.push(note);
            selectedId = note.id;
            persist();
            render();
            textarea.focus();
        });

        textarea.addEventListener('input', () => {
            const note = getSelected();
            if (!note) return;
            note.content = textarea.value;
            note.title = displayTitle(note);
            note.updatedAt = Date.now();
            persist();
            renderList();
            titleLine.textContent = displayTitle(note);
            os.setStatus('Saved');
        });

        sidebar.append(newBtn, list);
        editorWrap.append(titleLine, textarea);
        wrap.append(sidebar, editorWrap);
        render();
        return wrap;
    }
};

export default notesApp;
