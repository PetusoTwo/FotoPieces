const HISTORY_KEY = 'fotopieces-history-v1';

const refs = {
    imageInput: document.getElementById('image-input'),
    imageFileName: document.getElementById('image-file-name'),
    startCamera: document.getElementById('start-camera'),
    mobileCameraBack: document.getElementById('mobile-camera-back'),
    mobileCameraFront: document.getElementById('mobile-camera-front'),
    mobileCameraInputBack: document.getElementById('mobile-camera-input-back'),
    mobileCameraInputFront: document.getElementById('mobile-camera-input-front'),
    capturePhoto: document.getElementById('capture-photo'),
    stopCamera: document.getElementById('stop-camera'),
    cameraPreview: document.getElementById('camera-preview'),
    cameraPreviewWrap: document.getElementById('camera-preview-wrap'),
    gridSize: document.getElementById('grid-size'),
    gridSizeLabel: document.getElementById('grid-size-label'),
    shufflePieces: document.getElementById('shuffle-pieces'),
    resetGame: document.getElementById('reset-game'),
    timer: document.getElementById('timer'),
    moves: document.getElementById('moves'),
    statusText: document.getElementById('status-text'),
    sourceName: document.getElementById('source-name'),
    board: document.getElementById('board'),
    boardImage: document.getElementById('board-image'),
    boardOverlay: document.getElementById('board-overlay'),
    tray: document.getElementById('tray'),
    playfield: document.getElementById('playfield'),
    piecesLayer: document.getElementById('pieces-layer'),
    victoryBanner: document.getElementById('victory-banner'),
    victorySummary: document.getElementById('victory-summary'),
    historyList: document.getElementById('history-list'),
};

const state = {
    rows: 4,
    cols: 4,
    moves: 0,
    elapsed: 0,
    startTime: 0,
    timerId: null,
    puzzleReady: false,
    solved: false,
    currentImageUrl: '',
    sourceLabel: '',
    pieces: [],
    stream: null,
    isMobile: false,
};

const rand = (min, max) => Math.random() * (max - min) + min;
const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

if (refs.playfield) {
    forceDarkMode();
    initResponsiveCameraUI();
    bindEvents();
    renderHistory();
}

function initResponsiveCameraUI() {
    const ua = navigator.userAgent || '';
    const coarsePointer = window.matchMedia ? window.matchMedia('(pointer: coarse)').matches : false;
    state.isMobile = /Android|iPhone|iPad|iPod|Mobile/i.test(ua) || (coarsePointer && navigator.maxTouchPoints > 0);

    if (!state.isMobile) {
        return;
    }

    refs.statusText.textContent = 'En telefono, usa camara trasera o frontal para tomar foto.';

    if (refs.startCamera) {
        refs.startCamera.classList.add('hidden');
    }
    if (refs.capturePhoto) {
        refs.capturePhoto.classList.add('hidden');
    }
    if (refs.stopCamera) {
        refs.stopCamera.classList.add('hidden');
    }
    if (refs.cameraPreviewWrap) {
        refs.cameraPreviewWrap.classList.add('hidden');
    }
    if (refs.mobileCameraBack) {
        refs.mobileCameraBack.classList.remove('hidden');
    }
    if (refs.mobileCameraFront) {
        refs.mobileCameraFront.classList.remove('hidden');
    }
}

function bindEvents() {
    refs.imageInput.addEventListener('change', onFilePicked);
    if (refs.mobileCameraInputBack) {
        refs.mobileCameraInputBack.addEventListener('change', onMobileCameraPicked);
    }
    if (refs.mobileCameraInputFront) {
        refs.mobileCameraInputFront.addEventListener('change', onMobileCameraPicked);
    }
    refs.gridSize.addEventListener('input', onGridChanged);
    refs.startCamera.addEventListener('click', startCamera);
    if (refs.mobileCameraBack) {
        refs.mobileCameraBack.addEventListener('click', () => openMobileCamera('back'));
    }
    if (refs.mobileCameraFront) {
        refs.mobileCameraFront.addEventListener('click', () => openMobileCamera('front'));
    }
    refs.capturePhoto.addEventListener('click', captureFromCamera);
    refs.stopCamera.addEventListener('click', stopCamera);
    refs.shufflePieces.addEventListener('click', () => shufflePieces(true));
    refs.resetGame.addEventListener('click', resetToEmpty);
    refs.historyList.addEventListener('click', onHistoryClick);

    window.addEventListener('beforeunload', stopCamera);
}

function openMobileCamera(side) {
    const targetInput = side === 'front' ? refs.mobileCameraInputFront : refs.mobileCameraInputBack;
    if (!targetInput) {
        return;
    }

    refs.statusText.textContent = side === 'front'
        ? 'Abriendo camara frontal...'
        : 'Abriendo camara trasera...';

    targetInput.click();
}

function onMobileCameraPicked(event) {
    const file = event.target.files?.[0];
    processPickedFile(file, 'Captura de camara');

    // Permite volver a tomar la misma foto consecutiva en algunos navegadores moviles.
    event.target.value = '';
}

function onGridChanged() {
    const size = Number(refs.gridSize.value);
    state.rows = size;
    state.cols = size;
    refs.gridSizeLabel.textContent = `${size} x ${size} piezas`;
}

function onFilePicked(event) {
    const file = event.target.files?.[0];
    processPickedFile(file, file?.name);
}

function processPickedFile(file, sourceLabel) {
    if (!file) {
        if (refs.imageFileName) {
            refs.imageFileName.textContent = 'Ningun archivo seleccionado';
        }
        return;
    }

    if (refs.imageFileName) {
        refs.imageFileName.textContent = file.name;
    }

    const reader = new FileReader();
    reader.onload = () => {
        if (typeof reader.result === 'string') {
            buildPuzzleFromData(reader.result, sourceLabel || file.name);
        }
    };
    reader.readAsDataURL(file);
}

async function startCamera() {
    if (state.isMobile) {
        openMobileCamera('back');
        return;
    }

    if (!navigator.mediaDevices?.getUserMedia) {
        refs.statusText.textContent = 'Tu navegador no soporta acceso a camara :c';
        return;
    }

    try {
        stopCamera();
        state.stream = await navigator.mediaDevices.getUserMedia({
            video: {
                facingMode: { ideal: 'environment' },
                width: { ideal: 1280 },
                height: { ideal: 720 },
            },
            audio: false,
        });
        refs.cameraPreview.srcObject = state.stream;
        refs.capturePhoto.disabled = false;
        refs.stopCamera.disabled = false;
        refs.statusText.textContent = 'Camara activa. Captura cuando quieras.';
    } catch (error) {
        refs.statusText.textContent = 'No se puede abrir la camara. Revisa permisos del navegador.';
        console.error(error);
    }
}

function stopCamera() {
    if (!state.stream) {
        return;
    }

    for (const track of state.stream.getTracks()) {
        track.stop();
    }
    state.stream = null;
    refs.cameraPreview.srcObject = null;
    refs.capturePhoto.disabled = true;
    refs.stopCamera.disabled = true;
}

function captureFromCamera() {
    const video = refs.cameraPreview;
    if (!video.videoWidth || !video.videoHeight) {
        refs.statusText.textContent = 'Esperando senal de la camara...';
        return;
    }

    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    const ctx = canvas.getContext('2d');
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const imageData = canvas.toDataURL('image/jpeg', 0.92);

    buildPuzzleFromData(imageData, 'Captura de camara');
    stopCamera();
}

async function buildPuzzleFromData(dataUrl, sourceLabel) {
    try {
        refs.statusText.textContent = 'Procesando imagen y creando piezas...';
        refs.piecesLayer.style.display = 'block';
        refs.victoryBanner.classList.add('hidden');
        refs.victoryBanner.classList.remove('flex');

        const img = await loadImage(dataUrl);
        state.sourceLabel = sourceLabel || 'Imagen';
        refs.sourceName.textContent = state.sourceLabel;

        clearTimer();
        resetPieces();

        const boardRect = refs.board.getBoundingClientRect();
        const boardWidth = Math.max(260, Math.floor(boardRect.width));
        const boardHeight = Math.max(180, Math.floor(boardRect.height));
        const {
            canvas: sourceCanvas,
            offsetX,
            offsetY,
            width: imgW,
            height: imgH
        } = createContainCanvas(img, boardWidth, boardHeight);

        state.currentImageUrl = sourceCanvas.toDataURL('image/jpeg', 0.82);

        refs.boardImage.style.backgroundImage = `url(${sourceCanvas.toDataURL('image/jpeg', 0.65)})`;

        const mesh = createRandomMesh(
            state.rows,
            state.cols,
            imgW,
            imgH,
            offsetX,
            offsetY
        );
        drawBoardOverlay(mesh, boardWidth, boardHeight);

        const playRect = refs.playfield.getBoundingClientRect();
        const boardLocal = toLocalRect(refs.board, refs.playfield);
        const trayLocal = toLocalRect(refs.tray, refs.playfield);
        const maxLayerW = playRect.width;
        const maxLayerH = playRect.height;

        const newPieces = [];
        let order = 1;
        for (let row = 0; row < state.rows; row += 1) {
            for (let col = 0; col < state.cols; col += 1) {
                const polygon = [
                    mesh[row][col],
                    mesh[row][col + 1],
                    mesh[row + 1][col + 1],
                    mesh[row + 1][col],
                ];

                const piece = makePieceFromPolygon({
                    id: `${row}-${col}`,
                    row,
                    col,
                    polygon,
                    sourceCanvas,
                    boardOffsetX: boardLocal.x,
                    boardOffsetY: boardLocal.y,
                    layerWidth: maxLayerW,
                    layerHeight: maxLayerH,
                    trayLocal,
                });

                piece.z = order;
                order += 1;
                newPieces.push(piece);
                refs.piecesLayer.appendChild(piece.el);
                positionPiece(piece);
                attachDragBehavior(piece);
            }
        }

        state.pieces = newPieces;
        state.moves = 0;
        state.elapsed = 0;
        state.puzzleReady = true;
        state.solved = false;
        refs.moves.textContent = '0';
        refs.timer.textContent = '00:00';
        refs.shufflePieces.disabled = false;
        refs.statusText.textContent = 'Arrastra y suelta las piezas hasta completar la imagen.';

        startTimer();
        shufflePieces(false);
    } catch (error) {
        refs.statusText.textContent = 'No pude procesar la imagen. Intenta con otra foto.';
        console.error(error);
    }
}

function makePieceFromPolygon({
    id,
    row,
    col,
    polygon,
    sourceCanvas,
    boardOffsetX,
    boardOffsetY,
    layerWidth,
    layerHeight,
    trayLocal,
}) {
    const minX = Math.floor(Math.min(...polygon.map((p) => p.x)));
    const maxX = Math.ceil(Math.max(...polygon.map((p) => p.x)));
    const minY = Math.floor(Math.min(...polygon.map((p) => p.y)));
    const maxY = Math.ceil(Math.max(...polygon.map((p) => p.y)));

    const width = maxX - minX;
    const height = maxY - minY;

    const pieceCanvas = document.createElement('canvas');
    pieceCanvas.width = Math.max(2, width + 2);
    pieceCanvas.height = Math.max(2, height + 2);

    const ctx = pieceCanvas.getContext('2d');
    ctx.save();
    ctx.translate(-minX + 1, -minY + 1);
    ctx.beginPath();
    polygon.forEach((point, index) => {
        if (index === 0) {
            ctx.moveTo(point.x, point.y);
        } else {
            ctx.lineTo(point.x, point.y);
        }
    });
    ctx.closePath();
    ctx.clip();
    ctx.drawImage(sourceCanvas, 0, 0);
    ctx.restore();

    ctx.beginPath();
    polygon.forEach((point, index) => {
        if (index === 0) {
            ctx.moveTo(point.x - minX + 1, point.y - minY + 1);
        } else {
            ctx.lineTo(point.x - minX + 1, point.y - minY + 1);
        }
    });
    ctx.closePath();
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.55)';
    ctx.lineWidth = 1.2;
    ctx.stroke();

    const el = document.createElement('img');
    el.src = pieceCanvas.toDataURL('image/png');
    el.alt = `pieza ${id}`;
    el.className = 'puzzle-piece absolute';
    el.draggable = false;
    el.style.width = `${pieceCanvas.width}px`;
    el.style.height = `${pieceCanvas.height}px`;

    const startX = rand(trayLocal.x + 10, trayLocal.x + Math.max(12, trayLocal.width - pieceCanvas.width - 10));
    const startY = rand(trayLocal.y + 20, trayLocal.y + Math.max(24, trayLocal.height - pieceCanvas.height - 10));

    return {
        id,
        row,
        col,
        polygon,
        x: clamp(startX, 0, layerWidth - pieceCanvas.width),
        y: clamp(startY, 0, layerHeight - pieceCanvas.height),
        width: pieceCanvas.width,
        height: pieceCanvas.height,
        targetX: boardOffsetX + minX - 1,
        targetY: boardOffsetY + minY - 1,
        rotate: rand(-18, 18),
        el,
        locked: false,
        z: 1,
    };
}

function attachDragBehavior(piece) {
    piece.el.addEventListener('pointerdown', (event) => {
        if (state.solved || piece.locked) {
            return;
        }

        const local = pointToLocal(event.clientX, event.clientY);
        const offsetX = local.x - piece.x;
        const offsetY = local.y - piece.y;

        piece.z = getNextZ();
        positionPiece(piece);
        piece.el.classList.add('dragging');
        piece.el.setPointerCapture(event.pointerId);

        const onMove = (moveEvent) => {
            const pos = pointToLocal(moveEvent.clientX, moveEvent.clientY);
            const maxX = refs.playfield.clientWidth - piece.width;
            const maxY = refs.playfield.clientHeight - piece.height;

            piece.x = clamp(pos.x - offsetX, 0, maxX);
            piece.y = clamp(pos.y - offsetY, 0, maxY);
            positionPiece(piece);
        };

        const onUp = (upEvent) => {
            piece.el.releasePointerCapture(upEvent.pointerId);
            piece.el.classList.remove('dragging');

            window.removeEventListener('pointermove', onMove);
            window.removeEventListener('pointerup', onUp);

            if (state.solved) {
                return;
            }

            state.moves += 1;
            refs.moves.textContent = String(state.moves);

            trySnap(piece);
        };

        window.addEventListener('pointermove', onMove);
        window.addEventListener('pointerup', onUp);
    });
}

function trySnap(piece) {
    const centerX = piece.x + piece.width / 2;
    const centerY = piece.y + piece.height / 2;
    const targetCenterX = piece.targetX + piece.width / 2;
    const targetCenterY = piece.targetY + piece.height / 2;

    const dist = Math.hypot(centerX - targetCenterX, centerY - targetCenterY);
    const snapDistance = Math.max(14, Math.min(piece.width, piece.height) * 0.2);

    if (dist > snapDistance) {
        return;
    }

    piece.x = piece.targetX;
    piece.y = piece.targetY;
    piece.rotate = 0;
    piece.locked = true;
    piece.el.classList.add('locked');
    positionPiece(piece);

    if (state.pieces.every((entry) => entry.locked)) {
        onPuzzleSolved();
    }
}

function onPuzzleSolved() {
    state.solved = true;
    clearTimer();

    refs.statusText.textContent = 'Waos!! Lo resolviste completo.';
    refs.victorySummary.textContent = `Tiempo: ${formatTime(state.elapsed)} | Movimientos: ${state.moves}`;
    refs.piecesLayer.style.display = 'none';
    refs.victoryBanner.classList.remove('hidden');
    refs.victoryBanner.classList.add('flex');

    saveHistoryEntry({
        image: state.currentImageUrl,
        sourceLabel: state.sourceLabel,
        rows: state.rows,
        cols: state.cols,
        moves: state.moves,
        elapsed: state.elapsed,
        solvedAt: new Date().toISOString(),
    });

    renderHistory();
}

function shufflePieces(countMove) {
    if (!state.puzzleReady) {
        return;
    }

    const trayLocal = toLocalRect(refs.tray, refs.playfield);
    let z = getNextZ();

    state.pieces.forEach((piece) => {
        if (piece.locked) {
            return;
        }

        piece.x = rand(trayLocal.x + 8, trayLocal.x + Math.max(12, trayLocal.width - piece.width - 8));
        piece.y = rand(trayLocal.y + 12, trayLocal.y + Math.max(16, trayLocal.height - piece.height - 8));
        piece.rotate = rand(-20, 20);
        piece.z = z;
        z += 1;
        positionPiece(piece);
    });

    if (countMove) {
        state.moves += 1;
        refs.moves.textContent = String(state.moves);
    }

    refs.statusText.textContent = 'Piezas mezcladas. Intenta resolverlo jeje.';
}

function resetToEmpty() {
    clearTimer();
    resetPieces();
    stopCamera();
    state.puzzleReady = false;
    state.solved = false;
    state.currentImageUrl = '';
    state.sourceLabel = '';
    state.moves = 0;
    state.elapsed = 0;

    refs.statusText.textContent = 'Sube una imagen o captura una foto para comenzar.';
    refs.sourceName.textContent = '';
    refs.timer.textContent = '00:00';
    refs.moves.textContent = '0';
    refs.shufflePieces.disabled = true;
    refs.imageInput.value = '';
    if (refs.mobileCameraInputBack) {
        refs.mobileCameraInputBack.value = '';
    }
    if (refs.mobileCameraInputFront) {
        refs.mobileCameraInputFront.value = '';
    }
    if (refs.imageFileName) {
        refs.imageFileName.textContent = 'Ningun archivo seleccionado';
    }
    refs.boardImage.style.backgroundImage = '';
    refs.piecesLayer.style.display = 'block';
    refs.victoryBanner.classList.add('hidden');
    refs.victoryBanner.classList.remove('flex');

    const overlayCtx = refs.boardOverlay.getContext('2d');
    overlayCtx.clearRect(0, 0, refs.boardOverlay.width, refs.boardOverlay.height);
}

function resetPieces() {
    state.pieces.forEach((piece) => piece.el.remove());
    state.pieces = [];
}

function clearTimer() {
    if (!state.timerId) {
        return;
    }
    clearInterval(state.timerId);
    state.timerId = null;
}

function startTimer() {
    clearTimer();
    state.startTime = Date.now();
    state.timerId = setInterval(() => {
        if (state.solved) {
            return;
        }

        state.elapsed = Math.floor((Date.now() - state.startTime) / 1000);
        refs.timer.textContent = formatTime(state.elapsed);
    }, 1000);
}

function formatTime(totalSec) {
    const minutes = Math.floor(totalSec / 60)
        .toString()
        .padStart(2, '0');
    const seconds = Math.floor(totalSec % 60)
        .toString()
        .padStart(2, '0');
    return `${minutes}:${seconds}`;
}

function createRandomMesh(rows, cols, width, height, startX = 0, startY = 0) {
    const stepX = width / cols;
    const stepY = height / rows;
    const jitterX = stepX * 0.18;
    const jitterY = stepY * 0.18;

    const points = [];
    for (let row = 0; row <= rows; row += 1) {
        const rowPoints = [];
        for (let col = 0; col <= cols; col += 1) {
            const edge = row === 0 || row === rows || col === 0 || col === cols;
            const x = startX + col * stepX + (edge ? 0 : rand(-jitterX, jitterX));
            const y = startY + row * stepY + (edge ? 0 : rand(-jitterY, jitterY));
            rowPoints.push({
                x: clamp(x, startX, startX + width),
                y: clamp(y, startY, startY + height),
            });
        }
        points.push(rowPoints);
    }
    return points;
}

function drawBoardOverlay(mesh, width, height) {
    const canvas = refs.boardOverlay;
    const ctx = canvas.getContext('2d');
    canvas.width = width;
    canvas.height = height;

    ctx.clearRect(0, 0, width, height);
    ctx.strokeStyle = 'rgba(148, 163, 184, 0.75)';
    ctx.lineWidth = 1;

    for (let row = 0; row < mesh.length - 1; row += 1) {
        for (let col = 0; col < mesh[row].length - 1; col += 1) {
            const points = [mesh[row][col], mesh[row][col + 1], mesh[row + 1][col + 1], mesh[row + 1][col]];

            ctx.beginPath();
            points.forEach((point, index) => {
                if (index === 0) {
                    ctx.moveTo(point.x, point.y);
                } else {
                    ctx.lineTo(point.x, point.y);
                }
            });
            ctx.closePath();
            ctx.stroke();
        }
    }
}

function createContainCanvas(img, targetWidth, targetHeight) {
    const canvas = document.createElement('canvas');
    canvas.width = targetWidth;
    canvas.height = targetHeight;

    const ctx = canvas.getContext('2d');

    const scale = Math.min(
        targetWidth / img.width,
        targetHeight / img.height
    );

    const newWidth = img.width * scale;
    const newHeight = img.height * scale;

    const offsetX = (targetWidth - newWidth) / 2;
    const offsetY = (targetHeight - newHeight) / 2;

    ctx.clearRect(0, 0, targetWidth, targetHeight);
    ctx.drawImage(img, offsetX, offsetY, newWidth, newHeight);

    return {
        canvas,
        offsetX,
        offsetY,
        width: newWidth,
        height: newHeight
    };
}

function loadImage(src) {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => resolve(img);
        img.onerror = reject;
        img.src = src;
    });
}

function toLocalRect(el, container) {
    const elRect = el.getBoundingClientRect();
    const base = container.getBoundingClientRect();
    return {
        x: elRect.left - base.left,
        y: elRect.top - base.top,
        width: elRect.width,
        height: elRect.height,
    };
}

function pointToLocal(clientX, clientY) {
    const rect = refs.playfield.getBoundingClientRect();
    return {
        x: clientX - rect.left,
        y: clientY - rect.top,
    };
}

function positionPiece(piece) {
    piece.el.style.transform = `translate3d(${piece.x}px, ${piece.y}px, 0) rotate(${piece.rotate}deg)`;
    piece.el.style.zIndex = String(piece.z);
}

function getNextZ() {
    return state.pieces.reduce((max, piece) => Math.max(max, piece.z), 1) + 1;
}

function saveHistoryEntry(entry) {
    const current = readHistory();
    const next = [entry, ...current];

    while (next.length > 0) {
        try {
            localStorage.setItem(HISTORY_KEY, JSON.stringify(next));
            return;
        } catch (error) {
            if (!isQuotaExceededError(error)) {
                console.error('No se pudo guardar historial:', error);
                return;
            }
            next.pop();
        }
    }

    console.warn('No hay espacio suficiente para guardar historial en localStorage.');
}

function isQuotaExceededError(error) {
    if (!error) {
        return false;
    }

    return (
        error.name === 'QuotaExceededError' ||
        error.name === 'NS_ERROR_DOM_QUOTA_REACHED' ||
        error.code === 22 ||
        error.code === 1014
    );
}

function readHistory() {
    try {
        const raw = localStorage.getItem(HISTORY_KEY);
        if (!raw) {
            return [];
        }
        const parsed = JSON.parse(raw);
        return Array.isArray(parsed) ? parsed : [];
    } catch {
        return [];
    }
}

function formatHistoryDate(isoDate) {
    const date = new Date(isoDate || Date.now());
    const datePart = date.toLocaleDateString();
    const timePart = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    return `${datePart} ${timePart}`;
}

function renderHistory() {
    const entries = readHistory();
    if (!entries.length) {
        refs.historyList.innerHTML = '<p class="text-sm text-slate-500 dark:text-slate-300">Todavia no resolviste puzzles en este navegador.</p>';
        return;
    }

    refs.historyList.innerHTML = entries
        .map((entry, index) => {
            return `
        <article class="rounded-xl border border-slate-300/70 bg-white/75 p-2 dark:border-slate-600 dark:bg-slate-900/70">
          <div class="flex min-w-0 items-center gap-2">
            <img src="${entry.image}" alt="Puzzle ${index + 1}" class="h-14 w-14 shrink-0 rounded-lg object-cover" />
            <div class="min-w-0 flex-1">
              <p class="truncate text-[11px] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-300">${entry.sourceLabel || 'Puzzle'}</p>
              <p class="text-xs font-medium text-slate-800 dark:text-slate-100">${entry.rows} x ${entry.cols} | ${formatTime(entry.elapsed || 0)}</p>
              <p class="truncate text-[11px] text-slate-500 dark:text-slate-300">${entry.moves || 0} mov | ${formatHistoryDate(entry.solvedAt)}</p>
            </div>
            <button type="button" data-history-index="${index}" class="cursor-pointer rounded-lg bg-[#011936] px-2 py-1 text-[11px] font-medium text-white transition hover:bg-[#102c52]">
              Rejugar
            </button>
          </div>
        </article>
      `;
        })
        .join('');
}

function onHistoryClick(event) {
    const button = event.target.closest('[data-history-index]');
    if (!button) {
        return;
    }

    const index = Number(button.dataset.historyIndex);
    const history = readHistory();
    const selected = history[index];

    if (!selected?.image) {
        return;
    }

    state.rows = selected.rows || state.rows;
    state.cols = selected.cols || state.cols;
    refs.gridSize.value = String(clamp(state.rows, 3, 7));
    refs.gridSizeLabel.textContent = `${state.rows} x ${state.cols} piezas`;

    buildPuzzleFromData(selected.image, `${selected.sourceLabel || 'Puzzle'} (rejuego)`);
}

function forceDarkMode() {
    document.documentElement.classList.add('dark');
}
