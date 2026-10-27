let output = "";

window.onload = function () {
    ZOHODESK.extension.onload().then(async function () {
        const webhookUrl = "https://www.zohoapis.in/crm/v7/functions/fecth_token_form_createor/actions/execute?auth_type=apikey&zapikey=1003.3a7ab408d690fec47b9e8f7236d95bed.a7d1a6ea0dfb1043e20401d09a9e26a4";

        try {
            let res = await ZOHODESK.request({
                url: webhookUrl,
                type: "GET",
                headers: {},
                postBody: {},
                data: {},
                responseType: "json"
            });

            if (typeof res === "string") res = JSON.parse(res);
            if (typeof res.data === "string") res.data = JSON.parse(res.data);

            output = res.data?.details?.output ??
                res.data?.data?.details?.output ??
                res.details?.output;

            if (output) sessionStorage.setItem("token", output);
            else console.error("Output not found:", res);
        } catch (e) {
            console.error("Token request failed:", e);
        }
    });
};

/* ==========================================
   WORKDRIVE CATEGORY FOLDER IDS
========================================== */

const categoryIds = {
    "KFIN Information": "5oq1b35cfe93a3e804fb4f6732dedef5422",
    "VR": "5twqzc3d5079cea194d6fb20019d098939249",
    "VR Signed": "6a1v0fab7062eafa54a4aaa4b8f27bb548785",
    "EVR": "6a1v0a8bc9ecc4dd84f1080e8d97d2f4777f1",
    "EVR Signed": "6a1v0673c077c8be94deab0ff3f5e3a1373a3",
    "Receipt": "6a1v0367f4f7f5a234e73901bfa5f66957b90",
    "Upload Shares Released": "991a6df09338acb10432a9748ff359cbb91e2",
    "Upload MCA Report": "991a6ab4a098892784d89b54449b76ef9fd38"
};

/* ==========================================
   ELEMENTS
========================================== */

const $ = id => document.getElementById(id);

const categoryElement = $("category");
const dateContainer = $("dateContainer");
const dateElement = $("date");
const fileInput = $("fileInput");
const uploadArea = $("uploadArea");
const uploadBtn = $("uploadBtn");
const removeFilesBtn = $("removeFilesBtn");
const fileList = $("fileList");
const fileItems = $("fileItems");
const fileCount = $("fileCount");
const statusElement = $("status");

/* ==========================================
   STATUS AND HTML HELPERS
========================================== */

function showStatus(message, type) {
    statusElement.className = "status-" + type;
    statusElement.innerHTML = message;
}

function escapeHtml(value) {
    const div = document.createElement("div");
    div.textContent = String(value ?? "");
    return div.innerHTML;
}

function formatFileSize(bytes) {
    return bytes < 1024 ? bytes + " B" :
        bytes < 1048576 ? (bytes / 1024).toFixed(1) + " KB" :
        (bytes / 1048576).toFixed(2) + " MB";
}

/* ==========================================
   FILE TYPE VALIDATION
========================================== */

const allowedFileTypes = {
    "KFIN Information": [".xls", ".xlsx"],
    "VR": [".pdf"],
    "VR Signed": [".pdf"],
    "EVR": [".pdf"],
    "EVR Signed": [".pdf"],
    "Receipt": [".pdf"],
    "Upload Shares Released": [".xls", ".xlsx"],
    "Upload MCA Report": [".xls", ".xlsx"]
};

function validateFiles(category, files) {
    const allowedExtensions = allowedFileTypes[category];

    if (!allowedExtensions) {
        return {
            valid: false,
            message: "Please select a valid category."
        };
    }

    for (const file of Array.from(files)) {
        const fileName = file.name.toLowerCase();

        const isValid = allowedExtensions.some(extension =>
            fileName.endsWith(extension)
        );

        if (!isValid) {
            return {
                valid: false,
                message:
                    `Invalid file: ${file.name}. ` +
                    `"${category}" accepts only ` +
                    `${allowedExtensions.join(", ")} files.`
            };
        }
    }

    return { valid: true };
}

/* ==========================================
   CATEGORY CHANGE
========================================== */

categoryElement.addEventListener("change", function () {
    dateContainer.style.display =
        this.value === "EVR Signed" ? "block" : "none";

    if (this.value !== "EVR Signed") dateElement.value = "";
});

/* ==========================================
   DISPLAY SELECTED FILES
========================================== */

function displayFiles(files) {
    fileItems.innerHTML = "";

    if (!files || !files.length) {
        fileList.style.display = "none";
        return;
    }

    fileList.style.display = "block";

    fileCount.textContent = files.length +
        (files.length === 1 ? " file selected" : " files selected");

    Array.from(files).forEach(file => {
        const item = document.createElement("div");
        item.className = "file-item";

        item.innerHTML = `
            <div class="file-icon">📄</div>
            <div class="file-info">
                <div class="file-name">${escapeHtml(file.name)}</div>
                <div class="file-size">${formatFileSize(file.size)}</div>
            </div>`;

        fileItems.appendChild(item);
    });
}

/* ==========================================
   REMOVE / CLEAR SELECTED FORM DATA
   Does not delete files already uploaded to WorkDrive
========================================== */

removeFilesBtn.addEventListener("click", function () {
    fileInput.value = "";
    categoryElement.value = "";
    dateElement.value = "";
    fileItems.innerHTML = "";
    fileCount.textContent = "";
    fileList.style.display = "none";
    statusElement.textContent = "";
    statusElement.className = "";

    // Keep the date field visibility consistent with the default category.
    dateContainer.style.display = "none";
});

fileInput.addEventListener("change", function () {
    displayFiles(this.files);

    if (this.files.length) {
        showStatus(
            this.files.length + " file(s) selected and ready to upload.",
            "info"
        );
    }
});

/* ==========================================
   DRAG AND DROP
========================================== */

uploadArea.addEventListener("dragover", e => {
    e.preventDefault();
    uploadArea.classList.add("drag-active");
});

uploadArea.addEventListener("dragleave", () =>
    uploadArea.classList.remove("drag-active")
);

uploadArea.addEventListener("drop", function (e) {
    e.preventDefault();
    uploadArea.classList.remove("drag-active");

    const transfer = new DataTransfer();

    Array.from(e.dataTransfer.files).forEach(file =>
        transfer.items.add(file)
    );

    if (!transfer.files.length) return;

    fileInput.files = transfer.files;
    displayFiles(fileInput.files);

    showStatus(
        transfer.files.length + " file(s) selected and ready to upload.",
        "info"
    );
});

/* ==========================================
   PARSE ZOHO RESPONSE
========================================== */

function parseZohoResponse(response) {
    let result = response;

    if (result?.statusMessage !== undefined) {
        result = result.statusMessage;
    }

    const parse = value => {
        if (typeof value === "string") {
            try {
                return JSON.parse(value);
            } catch (e) {}
        }
        return value;
    };

    result = parse(result);

    if (result?.response !== undefined && result.data === undefined) {
        result = parse(result.response);
    }

    return result;
}

/* ==========================================
   UPLOAD ONE FILE TO WORKDRIVE
========================================== */

async function uploadFileToWorkDrive(file, folderId) {
    if (!(file instanceof File) || !file.size) {
        throw new Error("Please provide a valid, non-empty File object.");
    }

    if (!folderId) {
        throw new Error("WorkDrive folder ID is missing.");
    }

    if (file.size > 20 * 1024 * 1024) {
        throw new Error("File exceeds the Zoho Desk SDK 20 MB limit.");
    }

    const token = sessionStorage.getItem("token");

    if (!token) {
        throw new Error("WorkDrive access token is missing.");
    }

    const response = await ZOHODESK.request({
        url: "https://www.zohoapis.in/workdrive/api/v1/upload",
        type: "POST",
        headers: {
            Authorization: "Zoho-oauthtoken " + token,
            Accept: "application/vnd.api+json",
            "Content-Type": "multipart/form-data"
        },
        postBody: {
            parent_id: folderId,
            filename: encodeURIComponent(file.name),
            "override-name-exist": "true"
        },
        fileObj: [{ key: "content", file }]
    });

    const result = typeof response === "string"
        ? JSON.parse(response)
        : response;

    const body = typeof result?.response === "string"
        ? JSON.parse(result.response)
        : result?.response ?? result;

    if (
        Number(result?.statusCode) >= 400 ||
        body?.status === false ||
        body?.status === "false" ||
        body?.statusMessage?.errors?.length
    ) {
        const error = new Error(JSON.stringify(body));
        error.apiResponse = body;
        throw error;
    }

    return body;
}

/* ==========================================
   UPLOAD MULTIPLE FILES
   AND CREATE FINAL SUMMARY OBJECT
========================================== */

async function uploadMultipleFiles(files, folderId, folderName) {
    const successfulFiles = [];
    const failedFiles = [];
    const allUploadedFileNames = [];
    const successResponses = [];
    const failureResponses = [];

    const fileArray = Array.from(files || []);

    for (let i = 0; i < fileArray.length; i++) {
        const file = fileArray[i];

        showStatus(
            `Uploading file ${i + 1} of ${fileArray.length}: <strong>${escapeHtml(file.name)}</strong>`,
            "info"
        );

        try {
            const response = await uploadFileToWorkDrive(file, folderId);

            successfulFiles.push(file.name);
            allUploadedFileNames.push(file.name);

            successResponses.push({
                fileName: file.name,
                response: response
            });

        } catch (e) {
            console.error("Upload failed:", file.name, e);

            failedFiles.push({
                name: file.name,
                message: e.message || String(e)
            });

            allUploadedFileNames.push(file.name);

            failureResponses.push({
                fileName: file.name,
                error: e.message || String(e),
                response: e.apiResponse || null
            });
        }
    }

    const uploadSummary = {
        Folder_Name: folderName,
        Response: allUploadedFileNames,
        Failure_Response: failureResponses,
        Failure_Count: failedFiles.length,
        Success_Response: successResponses,
        Success_Count: successfulFiles.length
    };

    console.log("Upload Summary:", uploadSummary);
    console.log(
        "Upload Summary JSON:",
        JSON.stringify(uploadSummary, null, 2)
    );

    let message = "";

    if (successfulFiles.length) {
        message =
            `✓ Successfully uploaded ${successfulFiles.length} of ${fileArray.length} file(s).<br>` +
            successfulFiles.map(escapeHtml).map(n => "• " + n).join("<br>");
    }

    if (failedFiles.length) {
        message += (message ? "<br><br>" : "") +
            `⚠ Failed to upload ${failedFiles.length} file(s):<br>` +
            failedFiles.map(f =>
                `• ${escapeHtml(f.name)} — ${escapeHtml(f.message)}`
            ).join("<br>");
    }

    if (!fileArray.length) {
        showStatus("Please select at least one document.", "warning");
    } else {
        showStatus(message, failedFiles.length ? "warning" : "success");
    }

    return uploadSummary;
}

/* ==========================================
   CREATE DATE FOLDER FOR EVR SIGNED
========================================== */

async function createWorkDriveFolder(parentFolderId, folderName) {
    const response = await ZOHODESK.request({
        url: "https://www.zohoapis.in/workdrive/api/v1/files",
        type: "POST",
        headers: {
            Accept: "application/vnd.api+json",
            "Content-Type": "application/vnd.api+json"
        },
        postBody: JSON.stringify({
            data: {
                attributes: {
                    parent_id: parentFolderId,
                    name: folderName
                },
                type: "files"
            }
        }),
        connectionLinkName: "zoho_workdrive_widget"
    });

    const result = parseZohoResponse(response);

    const folderId =
        result?.statusMessage?.data?.id ||
        result?.data?.[0]?.id ||
        result?.data?.[0]?.attributes?.id ||
        result?.id;

    if (!folderId) {
        throw new Error(
            "Folder ID not found in response. Check the browser console."
        );
    }

    return folderId;
}

/* ==========================================
   CREATE ZOHO CRM AUDIT LOG
========================================== */
function getCurrentDateTimeIST() {
    const now = new Date();

    // Convert to India Standard Time
    const istTime = new Date(
        now.toLocaleString("en-US", { timeZone: "Asia/Kolkata" })
    );

    const year = istTime.getFullYear();
    const month = String(istTime.getMonth() + 1).padStart(2, "0");
    const day = String(istTime.getDate()).padStart(2, "0");
    const hours = String(istTime.getHours()).padStart(2, "0");
    const minutes = String(istTime.getMinutes()).padStart(2, "0");
    const seconds = String(istTime.getSeconds()).padStart(2, "0");

    return `${year}-${month}-${day}T${hours}:${minutes}:${seconds}+05:30`;
}
async function createZohoCRMRecord(uploadSummary) {
    const requestBody = {
        data: [{
            Name: categoryElement.value,
            Trigger_Time: getCurrentDateTimeIST(),
            Response: uploadSummary.Response.join(", "),
            Failure_Count: uploadSummary.Failure_Count,
            Success_Response: JSON.stringify(
                uploadSummary.Success_Response.map(item => item.fileName)
            ),
            Success_Count: uploadSummary.Success_Count,
            Failure_Response: JSON.stringify(
                uploadSummary.Failure_Response
            )
        }],
        trigger: []
    };

    console.log("CRM Request Body:", requestBody);

    try {
        const response = await ZOHODESK.request({
            url: "https://www.zohoapis.in/crm/v8/Audit_Logs",
            type: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            postBody: JSON.stringify(requestBody),
            connectionLinkName: "crm_widgets"
        });

        const result = parseZohoResponse(response);

        console.log("Full CRM Response:", response);
        console.log("Parsed CRM Response:", result);

    } catch (e) {
        console.error("CRM API request failed:", e);
    }
}

/* ==========================================
   MAIN UPLOAD BUTTON
========================================== */

uploadBtn.addEventListener("click", async function () {
    const category = categoryElement.value;

    if (!category) {
        showStatus("⚠ Please select a document category.", "warning");
        categoryElement.focus();
        return;
    }

    let dateValue = "";

    if (category === "EVR Signed") {
        dateValue = dateElement.value.trim();

        const match = dateValue.match(/^(\d{4})-(\d{2})-(\d{2})$/);

        if (!match) {
            showStatus(
                "⚠ Please enter a valid date in YYYY-MM-DD format.",
                "warning"
            );
            dateElement.focus();
            return;
        }

        const [year, month, day] = match.slice(1).map(Number);
        const date = new Date(Date.UTC(year, month - 1, day));

        if (
            date.getUTCFullYear() !== year ||
            date.getUTCMonth() !== month - 1 ||
            date.getUTCDate() !== day
        ) {
            showStatus(
                "⚠ Invalid date. Enter a valid date in YYYY-MM-DD format.",
                "warning"
            );
            dateElement.focus();
            return;
        }
    }

    const files = fileInput.files;

    if (!files || !files.length) {
        showStatus("⚠ Please select at least one document.", "warning");
        return;
    }

    /* ==========================================
       ADDED FILE TYPE VALIDATION
       Runs before WorkDrive upload
    ========================================== */

    const validation = validateFiles(category, files);

    if (!validation.valid) {
        showStatus(
            "⚠ " + escapeHtml(validation.message),
            "warning"
        );
        fileInput.focus();
        return;
    }

    /* ==========================================
       EXISTING UPLOAD LOGIC
    ========================================== */

    const parentFolderId = categoryIds[category];

    if (!parentFolderId) {
        showStatus(
            "⚠ Folder ID is not configured for this category.",
            "warning"
        );
        return;
    }

    uploadBtn.disabled = true;

    try {
        let destinationFolderId = parentFolderId;

        if (category === "EVR Signed") {
            showStatus(
                `Creating WorkDrive folder <strong>${escapeHtml(dateValue)}</strong>...`,
                "info"
            );

            destinationFolderId = await createWorkDriveFolder(
                parentFolderId,
                dateValue
            );
        }

        const folderName =
            category === "EVR Signed" ? dateValue : category;

        const uploadSummary = await uploadMultipleFiles(
            files,
            destinationFolderId,
            folderName
        );

        console.log("Final Object:", uploadSummary);
        console.log("Folder Name:", uploadSummary.Folder_Name);
        console.log("All File Names:", uploadSummary.Response);
        console.log("Failure Count:", uploadSummary.Failure_Count);
        console.log("Success Count:", uploadSummary.Success_Count);
        console.log("Failure Responses:", uploadSummary.Failure_Response);
        console.log("Success Responses:", uploadSummary.Success_Response);

        createZohoCRMRecord(uploadSummary);

    } catch (e) {
        console.error("WorkDrive operation failed:", e);

        showStatus(
            "⚠ WorkDrive operation failed: " +
            escapeHtml(e.message || String(e)),
            "error"
        );

    } finally {
        uploadBtn.disabled = false;
    }
});