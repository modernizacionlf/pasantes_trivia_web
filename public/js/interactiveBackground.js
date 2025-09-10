document.addEventListener('DOMContentLoaded', () => {
    const loadParticles = () => {
        const isDarkMode = document.documentElement.classList.contains('dark-mode');

        const particleColor = isDarkMode ? "#ffffff" : "#374151";
        const linkColor = isDarkMode ? "#ffffff" : "#374151";

        const existingContainer = tsParticles.domItem(0);
        if (existingContainer) {
            existingContainer.destroy();
        }

        tsParticles.load({
            id: "tsparticles",
            options: {
                background: {
                    color: {
                        value: "transparent"
                    }
                },
                particles: {
                    number: {
                        value: 250,
                        limit: 250,
                        density: {
                            enable: true,
                        }
                    },
                    color: {
                        value: particleColor
                    },
                    links: {
                        color: linkColor,
                        distance: 150,
                        enable: true,
                        opacity: 0.2,
                        width: 1
                    },
                    move: {
                        enable: true,
                        speed: 1,
                        direction: "none",
                        outModes: "out"
                    },
                    opacity: {
                        value: { min: 0.1, max: 0.5 }
                    },
                    shape: {
                        type: "circle"
                    },
                    size: {
                        value: { min: 1, max: 3 }
                    }
                },
                interactivity: {
                    events: {
                        onHover: {
                            enable: true,
                            mode: "grab"
                        },
                        
                    },
                    modes: {
                        grab: {
                            distance: 140,
                            links: {
                                opacity: 0.8
                            }
                        },
                        push: {
                            quantity: 4
                        }
                    }
                },
                detectRetina: true
            }
        });
    };

    loadParticles();

    const themeToggleButton = document.getElementById('theme-toggle-button');
    if (themeToggleButton) {
        themeToggleButton.addEventListener('click', () => {
            setTimeout(loadParticles, 50);
        });
    }
});