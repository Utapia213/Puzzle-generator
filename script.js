const imageLoader = document.getElementById('imageLoader');
const startButton = document.getElementById('startButton');
const piecesContainer = document.getElementById('piecesContainer');
const dropContainer = document.getElementById('dropContainer');
const timerEl= document.getElementById('timer');
const placeSound = document.getElementById('placeSound');
const successSound = document.getElementById('successSound');

let originalImage = null;
let gridSize = 3;
let pieces = [];
let timerInterval;
let startTime;
const gridSizeSelector = document.getElementById('gridSize');
startButton.addEventListener('click', () => {
    gridSize = parseInt(gridSizeSelector.value, 10);
    initPuzzle();
});

piecesContainer.addEventListener('dragover', dragOver);
piecesContainer.addEventListener('drop', function(e) {
    e.preventDefault();
    const pieceId = e.dataTransfer.getData('text/plain');
    const piece = document.getElementById(pieceId);
    if (piece) {
        piecesContainer.appendChild(piece);
        piece.draggable = true;
        placeSound.play();
    }
});

imageLoader.addEventListener('change', handleImage);
function handleImage(e){
    const file = e.target.files[0];
    if(!file)return;
    const reader = new FileReader();
    reader.onload =(event) => {
        const img = new Image();
        img.onload = () => {
            originalImage = img;
            startButton.disabled = false;
        };
        img.src = event.target.result;
    };
    reader.readAsDataURL(file);
}

function initPuzzle() {
    clearPuzzle();
    createGrid();
    scramblePieces();
    startTimer();
}

function clearPuzzle() {
    pieces = [];
    clearInterval(timerInterval);
    timerEl.textContent = '00:00';
    piecesContainer.innerHTML = '';
    dropContainer.innerHTML = '';
}

function createGrid() {
    const pieceWidth = Math.floor(originalImage.width / gridSize);
    const pieceHeight = Math.floor(originalImage.height / gridSize);
     dropContainer.style.gridTemplateColumns = `repeat(${gridSize}, 1fr)`;
    dropContainer.style.gridTemplateRows = `repeat(${gridSize}, 1fr)`;
    const cellSize = 180; // px, match your .drop-zone size
    dropContainer.style.width = `${gridSize * cellSize + (gridSize - 1) * 5}px`;
    dropContainer.style.height = `${gridSize * cellSize + (gridSize - 1) * 5}px`;

    for(let row = 0; row < gridSize; row++){
        for(let col = 0; col < gridSize; col++){
            const zone = document.createElement('div');
            zone.classList.add('drop-zone');
            zone.dataset.row = row;
            zone.dataset.col = col;
            zone.addEventListener('dragover', dragOver);
            zone.addEventListener('drop', dropOver);
            dropContainer.appendChild(zone);

            const canvas = document.createElement('canvas');
            canvas.width = pieceWidth;
            canvas.height = pieceHeight;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(
                originalImage,
                col * pieceWidth,
                row * pieceHeight,
                pieceWidth,
                pieceHeight,
                0,
                0,
                pieceWidth,
                pieceHeight
            );
            const dataUrl = canvas.toDataURL();
            const img = document.createElement('img');
            img.src = dataUrl;
            img.width = pieceWidth;
            img.height = pieceHeight;
            img.classList.add('puzzle-piece');
            img.draggable = true;
            img.id = `piece-${row}-${col}`;
            img.addEventListener('dragstart', dragStart);
            pieces.push({ img, row, col });
        }
    }
}    

function scramblePieces(){
    const shuffled = pieces.sort(() => Math.random() - 0.5);
    shuffled.forEach(piece => piecesContainer.appendChild(piece.img));
}

function dragStart(e){
    if (e.target.classList.contains('locked')) {
        e.preventDefault();
        return false;
    }
    e.dataTransfer.setData('text/plain', e.target.id);
}

function dragOver(e) {
    e.preventDefault();
}

function dropOver(e){
    e.preventDefault();
    const pieceId = e.dataTransfer.getData('text/plain');
    const piece = document.getElementById(pieceId);

    // Don't allow dragging locked pieces
    if (piece.classList.contains('locked')) return;

    if (e.target.classList.contains('drop-zone')) {
        // Don't allow dropping onto a locked piece
        if (e.target.firstChild && e.target.firstChild.classList.contains('locked')) {
            return;
        }

        // If swapping, handle the old piece
        if (e.target.firstChild) {
            const oldPiece = e.target.firstChild;
            const fromZone = piece.parentElement;
            e.target.replaceChild(piece, oldPiece);

            // If oldPiece came from a drop-zone, check if it should be locked there
            if (fromZone.classList && fromZone.classList.contains('drop-zone')) {
                fromZone.appendChild(oldPiece);
                const [__, oldRow, oldCol] = oldPiece.id.split('-');
                if (
                    Number(fromZone.dataset.row) === Number(oldRow) &&
                    Number(fromZone.dataset.col) === Number(oldCol)
                ) {
                    oldPiece.draggable = false;
                    oldPiece.classList.add('locked');
                    oldPiece.removeEventListener('dragstart', dragStart);
                } else {
                    oldPiece.draggable = true;
                    oldPiece.classList.remove('locked');
                    oldPiece.addEventListener('dragstart', dragStart);
                }
            } else {
                // If oldPiece goes to tray, always unlock
                piecesContainer.appendChild(oldPiece);
                oldPiece.draggable = true;
                oldPiece.classList.remove('locked');
                oldPiece.addEventListener('dragstart', dragStart);
            }
        } else {
            e.target.appendChild(piece);
        }

        // Lock the dropped piece if it's in the correct spot
        const [__, correctRow, correctCol] = piece.id.split('-');
        if (
            Number(e.target.dataset.row) === Number(correctRow) &&
            Number(e.target.dataset.col) === Number(correctCol)
        ) {
            piece.draggable = false;
            piece.classList.add('locked');
            piece.removeEventListener('dragstart', dragStart);
        } else {
            piece.draggable = true;
            piece.classList.remove('locked');
            piece.addEventListener('dragstart', dragStart);
        }

        placeSound.play();
        checkCompletion();
    }
}
function startTimer(){
    startTime = Date.now();
    timerInterval = setInterval(updateTimer, 1000);
}

function updateTimer(){
    const elapsed = Date.now()- startTime;
    const min = Math.floor(elapsed / 60000);
    const sec = Math.floor((elapsed % 60000) / 1000);
    timerEl.textContent = `${min.toString().padStart(2, '0')}:${sec.toString().padStart(2, '0')}`;
}

function checkCompletion() {
    const zones = Array.from(document.querySelectorAll('.drop-zone'));
    const done = zones.every(zone => {
        if (!zone.firstChild) return false;
        const [, row, col] = zone.firstChild.id.split('-'); // <-- fix here
        return parseInt(zone.dataset.row) === parseInt(row) && parseInt(zone.dataset.col) === parseInt(col);
    });
    if (done) {
        clearInterval(timerInterval);
        successSound.play();
        alert('Congratulations! You completed the puzzle!');
    }
}
