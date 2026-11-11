// ... (rest of the file remains same, only the function below is updated)

// ⭐ OVERWRITE FIX: Purani URLs ko replace karega (XSS Safe)
window.handleMainColorUpload = async function(input) {
    if (input.files.length === 0) return; 
    const fileNameSpan = document.getElementById('pMainColorImgName'); 
    fileNameSpan.innerText = 'Uploading...'; 
    let urls = [];
    try {
        for (let i = 0; i < input.files.length; i++) { const url = await uploadFileToSupabase(input.files[i]); urls.push(url); }
        document.getElementById('pMainColor').value = urls.join(',');
        fileNameSpan.innerText = `${urls.length} images uploaded`; 
        renderColorPreviews(); // This function now uses escapeHTML
        alert("Images uploaded successfully!\n\n⚠️ ZAROORI: Ab Color Name wale box mein exactly usi order mein naam likhein jis order mein aapne images select ki hain.");
    } catch (err) { alert('Upload failed: ' + err.message); fileNameSpan.innerText = 'Failed'; }
};

function renderColorPreviews() {
    const container = document.getElementById('pMainColorPreview'); 
    const val = document.getElementById('pMainColor').value.trim(); 
    if(!val) { container.innerHTML = ''; return; }
    const urls = val.split(',').map(u => u.trim()).filter(Boolean);
    container.innerHTML = urls.map((url, idx) => { 
        if(url.startsWith('http')) { 
            // ⭐ SECURITY FIX: escapeHTML applied ⭐
            return `<div class="preview-item"><img src="${escapeHTML(url)}" onclick="openImageLightbox('${escapeHTML(url)}')" title="Click to view"><button class="preview-remove" onclick="removeColorUrl(${idx})" title="Remove Image">X</button></div>`; 
        } else { 
            return `<div class="preview-item" style="background:${escapeHTML(url)};"><button class="preview-remove" onclick="removeColorUrl(${idx})" title="Remove Color">X</button></div>`; 
        } 
    }).join('');
}

// ... (rest of the file remains same)
