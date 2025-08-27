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

    // Estado inicial del juego
    let questions = [];
    let currentQuestionIndex = 0;
    let score = 0;
    let timer;
    let timeLeft = 15;
    const totalQuestions = 5;
    let idJuegoActual = null;

    const categoryId = localStorage.getItem('categoriaSeleccionada');
    if (!categoryId) {
        showError('No se ha seleccionado una categoría. Volviendo al inicio...', true);
        return;
    }
    startGame(categoryId);

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
                questions = result.data.slice(0, totalQuestions);
                currentQuestionIndex = 0;
                score = 0;
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

        startTimer();
    }

    function startTimer() {
        timeLeft = 15;
        timerEl.textContent = timeLeft;
        progressBar.style.transition = 'none'; // Se resetea la transición para el cambio de color
        progressBar.style.backgroundColor = 'var(--color-teal)';
        progressBar.style.width = '100%';
        
        void progressBar.offsetWidth; 

        progressBar.style.transition = 'width 1s linear, background-color 0.5s linear';

        timer = setInterval(() => {
            timeLeft--;
            timerEl.textContent = timeLeft;

            if (timeLeft <= 5) {
                progressBar.style.backgroundColor = 'var(--color-error)';
            }
            
            if (timeLeft <= 0) {
                clearInterval(timer);
                progressBar.style.width = '0%';
                handleTimeout();
            } else {
                const percentageLeft = (timeLeft / 15) * 100;
                progressBar.style.width = `${percentageLeft}%`;
            }
        }, 1000);
    }

    async function selectAnswer(selectedButton, question) {
        clearInterval(timer);
        disableOptions();
        feedbackEl.textContent = 'Verificando...';
        
        try {
            const bodyPayload = { 
                id_juego: idJuegoActual,
                preguntaId: question.id, 
                respuestaUsuario: selectedButton.dataset.optionText, // Enviamos el texto de la respuesta
                tiempoRestante: timeLeft,
                respuestaCorrectaEncriptada: question.respuesta_correcta // Enviamos la respuesta encriptada
            };

            const response = await fetch('/api/game/check-answer', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(bodyPayload)
            });

            if (!response.ok) {
                 // Si la respuesta es 400 o 500, se muestra un error genérico
                throw new Error('No se pudo verificar la respuesta.');
            }
            
            const result = await response.json();

            if (result.success) {
                const { esCorrecta, opcionCorrecta, puntosObtenidos } = result.data;
                if (esCorrecta) {
                    selectedButton.classList.add('correct');
                    score += puntosObtenidos;
                    feedbackEl.textContent = `¡Correcto! +${puntosObtenidos} puntos`;
                } else {
                    selectedButton.classList.add('incorrect');
                    // Buscamos el botón correcto por su texto
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
        if (currentQuestionIndex < questions.length) {
            displayQuestion();
        } else {
            endGame();
        }
    }

    async function endGame() {
        if (idJuegoActual !== null) {
            try {
                await fetch('/api/game/end-game', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        id_juego: idJuegoActual,
                        puntuacion_final: score
                    })
                });
            } catch (error) {
                console.error('No se pudo guardar la puntuación final:', error);
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
