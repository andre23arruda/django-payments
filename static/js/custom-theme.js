function hidePageLoader() {
    const pageLoader = document.querySelector('.page-loader-wrapper');
    if (pageLoader && !pageLoader.classList.contains('loaded')) {
        pageLoader.classList.add('loaded');
        setTimeout(function() {
            pageLoader.style.display = 'none';
        }, 400);
    }
}

// Aguarda todos os assets (CSS, imagens, scripts) e fontes terminarem de carregar
if (document.readyState === 'complete') {
    if (document.fonts && document.fonts.ready) {
        document.fonts.ready.then(hidePageLoader).catch(hidePageLoader);
    } else {
        hidePageLoader();
    }
} else {
    window.addEventListener('load', function() {
        if (document.fonts && document.fonts.ready) {
            document.fonts.ready.then(hidePageLoader).catch(hidePageLoader);
        } else {
            hidePageLoader();
        }
    });
}

// Fallback de segurança (caso algum recurso externo demore para responder)
setTimeout(function() {
    hidePageLoader();
}, 2500);

