document.addEventListener('DOMContentLoaded', () => {
    const loadingScreen = document.getElementById('loading-screen');
    const loadingError = document.getElementById('loading-error');
    const gameScreen = document.getElementById('game-screen');
    const scoreDisplayEl = document.getElementById('score-display');
    const timerEl = document.getElementById('timer');
    const progressBar = document.getElementById('progress-bar');
    const questionTextEl = document.getElementById('question-text');
    const imageContainer = document.getElementById('image-container');
    const questionImage = document.getElementById('question-image');
    const optionsContainer = document.getElementById('options-container');
    const feedbackEl = document.getElementById('feedback');
    const questionCounterEl = document.getElementById('question-counter');

    // --- Variables de estado del juego ---
    let questions = [];
    let currentQuestionIndex = 0;
    let score = 0;
    let timer;
    let timeLeft = 15;
    let idJuegoActual = null;
    let correctAnswersCount = 0;
    let gameStartTime;
    let timerEndTime = 0; 

    const gameStateKey = 'triviaGameState';

    const savedGameState = localStorage.getItem(gameStateKey);

    if (savedGameState) {
        resumeGame(JSON.parse(savedGameState));
    } else {
        const categoryId = localStorage.getItem('categoriaSeleccionada');
        if (!categoryId) {
            showError('No se ha seleccionado una categoría. Volviendo al inicio...', true);
            return;
        }
        startGame(categoryId);
    }

    // --- Funciones del Juego ---
    function saveGameState() {
        const state = {
            questions,
            currentQuestionIndex,
            score,
            idJuegoActual,
            correctAnswersCount,
            gameStartTime,
            timerEndTime 
        };
        localStorage.setItem(gameStateKey, JSON.stringify(state));
    }
    
    function resumeGame(state) {
        questions = state.questions;
        currentQuestionIndex = state.currentQuestionIndex;
        score = state.score;
        idJuegoActual = state.idJuegoActual;
        correctAnswersCount = state.correctAnswersCount;
        gameStartTime = state.gameStartTime;
        timerEndTime = state.timerEndTime;

        scoreDisplayEl.textContent = `Puntuación: ${score}`;
        loadingScreen.style.display = 'none';
        gameScreen.style.display = 'block';

        const remainingTime = Math.round((timerEndTime - Date.now()) / 1000);
        
        if (remainingTime <= 0) {
            // Si el tiempo se termina mientras la página estaba cerrada
            displayQuestion();
            setTimeout(handleTimeout, 100);
        } else {
            timeLeft = remainingTime;
            displayQuestion();
        }
    }
    
    async function startGame(categoryId) {
        try {
            const response = await fetch(`/api/game/questions/${categoryId}`);
            if (!response.ok) {
                const errorData = await response.json().catch(() => null);
                throw new Error(errorData?.error || 'No se pudieron cargar las preguntas.');
            }
            const result = await response.json();

            if (result.success && result.data.length > 0) {
                idJuegoActual = result.id_juego;
                questions = result.data;
                currentQuestionIndex = 0;
                score = 0;
                correctAnswersCount = 0; 
                gameStartTime = Date.now();
                
                scoreDisplayEl.textContent = `Puntuación: ${score}`;
                loadingScreen.style.display = 'none';
                gameScreen.style.display = 'block';

                displayQuestion();
            } else {
                throw new Error(result.error || 'No hay preguntas disponibles para esta categoría.');
            }
        } catch (error) {
            showError(error.message, true);
        }
    }
    
    function displayQuestion() {
        resetState();
        const question = questions[currentQuestionIndex];
        questionTextEl.textContent = question.pregunta;
        questionCounterEl.textContent = `${currentQuestionIndex + 1}/${questions.length}`;

        if (question.imagen) {
            questionImage.src = question.imagen;
            imageContainer.style.display = 'block';
        } else {
            imageContainer.style.display = 'none';
        }

        question.opciones.forEach(option => {
            const button = document.createElement('input');
            button.type = 'button';
            button.value = option.texto;
            button.dataset.optionText = option.texto; 
            button.onclick = () => selectAnswer(button, question);
            optionsContainer.appendChild(button);
        });

        // startTimer decide si es un timer nuevo o reanudado
        startTimer();
    }
    
    function startTimer() {
        // Si no se esta reanudando un juego, reinicia el tiempo.
        // Si se esta reanudando, `timeLeft` ya tiene el valor correcto.
        if (timeLeft > 15 || timeLeft <= 0) {
            timeLeft = 15;
        }

        timerEl.textContent = timeLeft;
        
        // Se guarda el momento exacto en que el timer debe terminar
        timerEndTime = Date.now() + timeLeft * 1000;
        saveGameState();

        progressBar.style.transition = 'none';
        progressBar.style.width = `${(timeLeft / 15) * 100}%`;
        progressBar.style.backgroundColor = timeLeft <= 5 ? 'var(--color-error)' : 'var(--color-teal)';
        
        void progressBar.offsetWidth; 
        progressBar.style.transition = `width ${timeLeft}s linear, background-color 0.5s linear`;
        progressBar.style.width = '0%';
        if (timeLeft <= 5) {
             setTimeout(() => {
                 progressBar.style.backgroundColor = 'var(--color-error)';
             }, (timeLeft - 5) * 1000);
        }


        timer = setInterval(() => {
            timeLeft--;
            timerEl.textContent = timeLeft;
            if (timeLeft <= 0) {
                clearInterval(timer);
                handleTimeout();
            }
        }, 1000);
    }
    
    async function selectAnswer(selectedButton, question) {
        clearInterval(timer);
        progressBar.style.transition = 'none'; // Detiene la animación de la barra
        disableOptions();
        feedbackEl.textContent = 'Verificando...';
        
        try {
            const bodyPayload = { 
                respuestaUsuario: selectedButton.dataset.optionText,
                tiempoRestante: timeLeft,
                respuestaCorrectaEncriptada: question.respuesta_correcta
            };

            const response = await fetch('/api/game/check-answer', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(bodyPayload)
            });

            if (!response.ok) {
                throw new Error('No se pudo verificar la respuesta.');
            }
            
            const result = await response.json();

            if (result.success) {
                const { esCorrecta, opcionCorrecta, puntosObtenidos } = result.data;
                if (esCorrecta) {
                    selectedButton.classList.add('correct');
                    score += puntosObtenidos;
                    correctAnswersCount++; 
                    feedbackEl.textContent = `¡Correcto! +${puntosObtenidos} puntos`;
                } else {
                    selectedButton.classList.add('incorrect');
                    const correctBtn = Array.from(optionsContainer.children).find(
                        btn => btn.dataset.optionText === opcionCorrecta
                    );
                    if (correctBtn) correctBtn.classList.add('correct');
                    feedbackEl.textContent = 'Incorrecto...';
                }
                scoreDisplayEl.textContent = `Puntuación: ${score}`;
            } else {
                throw new Error(result.error || 'Error al procesar la respuesta.');
            }

            setTimeout(goToNextStep, 2000);

        } catch (error) {
            feedbackEl.textContent = error.message;
            setTimeout(goToNextStep, 3000);
        }
    }
    
    function handleTimeout() {
        feedbackEl.textContent = '¡Se acabó el tiempo!';
        disableOptions();
        setTimeout(goToNextStep, 2000);
    }

    function goToNextStep() {
        currentQuestionIndex++;
        timeLeft = 15; // Se reinicia el tiempo para la siguiente pregunta
        if (currentQuestionIndex < questions.length) {
            displayQuestion();
        } else {
            endGame();
        }
    }

    async function endGame() {
        localStorage.removeItem(gameStateKey);
        
        if (idJuegoActual !== null) {
            try {
                const gameEndTime = Date.now();
                const totalTimeInSeconds = Math.round((gameEndTime - gameStartTime) / 1000);

                const gameSummary = {
                    id_juego: idJuegoActual,
                    puntuacion_final: score,
                    respuestas_correctas: correctAnswersCount,
                    total_preguntas: questions.length,
                    tiempo_total_segundos: totalTimeInSeconds
                };

                await fetch('/api/game/end-game', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(gameSummary)
                });
            } catch (error) {
                console.error('No se pudo guardar el resumen del juego:', error);
            }
        }
        
        const categoryId = localStorage.getItem('categoriaSeleccionada');
        const user = JSON.parse(localStorage.getItem('user'));
    
        if (categoryId && user) {
            user.jugadas = user.jugadas || [];
            const categoryIdNumber = parseInt(categoryId, 10);
            if (!user.jugadas.includes(categoryIdNumber)) {
                user.jugadas.push(categoryIdNumber);
            }
            localStorage.setItem('user', JSON.stringify(user));
        }
        localStorage.removeItem('categoriaSeleccionada');
        window.location.href = '/results.html';
    }

    function resetState() {
        clearInterval(timer);
        optionsContainer.innerHTML = '';
        feedbackEl.textContent = '';
        if (imageContainer) {
            imageContainer.style.display = 'none';
            questionImage.src = '';
        }
    }
    
    function disableOptions() {
        Array.from(optionsContainer.children).forEach(button => {
            button.disabled = true;
        });
    }

    function showError(message, redirectToHome = false) {
        loadingScreen.style.display = 'block';
        gameScreen.style.display = 'none';
        loadingError.textContent = message;
        loadingError.style.display = 'block';
        if (redirectToHome) {
            setTimeout(() => window.location.href = '/categories.html', 3000);
        }
    }
});