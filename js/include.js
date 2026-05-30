document.addEventListener("DOMContentLoaded", () => {
    const sidebar = document.querySelector(".article-sidebar[data-include]");
    
    if (sidebar) {
        const fileUrl = sidebar.getAttribute("data-include");
        
        // Obtener el nombre del archivo actual (ej. "hormuz-selective-blockade-240326.html")
        const currentFilename = window.location.pathname.split("/").pop();
        
        fetch(fileUrl)
            .then(response => {
                if (!response.ok) {
                    throw new Error("Network response error: " + response.statusText);
                }
                return response.text();
            })
            .then(htmlContent => {
                // 1. Creamos un contenedor temporal en memoria para manipular el HTML que llegó
                const tempDiv = document.createElement("div");
                tempDiv.innerHTML = htmlContent;
                
                // 2. Buscamos el enlace en el sidebar que coincida con el archivo actual
                const currentLink = tempDiv.querySelector(`a[href="${currentFilename}"]`);
                
                // 3. Si existe, lo removemos de la lista
                if (currentLink) {
                    currentLink.remove();
                }
                
                // 4. Inyectamos el HTML limpio (sin el artículo actual) en el aside real
                sidebar.innerHTML = tempDiv.innerHTML;
            })
            .catch(error => console.error("Error inserting custom sidebar:", error));
    }
});