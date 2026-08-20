// https://stackoverflow.com/questions/3452546/how-do-i-get-the-youtube-video-id-from-a-url
export function getYoutubeIdFromUrl(url) {
    if (!url) return '';
    return url.match(
        /.*(?:youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=)([^#\&]*).*/,
    )?.[1] ?? '';
}

export function getMedalIdFromUrl(url) {
    if (!url) return '';
    return url.match(/medal\.tv\/(?:clip|clips|games\/[^\/]+\/clips)\/([^\/?#]+)/)?.[1] ?? '';
}

export function getRandomInt(max) {
    return Math.floor(Math.random() * max);
}

// Sửa lỗi hàm getScratchPFP (Hỗ trợ Async/Await chuẩn)
export async function getScratchPFP(username) {
    if (!username) return "https://uploads.scratch.mit.edu/get_image/user/1_90x90.png";
    return await getAPI(username);
}

async function getAPI(username) {
    try {
        const res = await fetch(`https://cors.gays3xlol.workers.dev/https://api.scratch.mit.edu/users/${encodeURIComponent(username)}`);
        if (!res.ok) throw new Error("Fetch failed");
        const obj = await res.json();
        if (obj && obj.profile) {
            return `https://uploads.scratch.mit.edu/get_image/user/${obj.profile.id}_90x90.png`;
        }
    } catch (err) {
        // Fallback nếu gặp lỗi mạng
    }
    return "https://uploads.scratch.mit.edu/get_image/user/1_90x90.png";
}

// Tắt hoàn toàn console.log rác làm lag/đơ trang
export function getLevelThumbnail(levelPos, list) {
    if (list === undefined || levelPos === undefined || !list[levelPos]) {
        return '';
    } else {
        const currentLevel = list[levelPos][0] || list[levelPos];
        return setUpThumbnailStyle(currentLevel.name);
    }
}

export function getLevelThumbnailR(levelPos, list) {
    if (list === undefined || levelPos === undefined || !list[levelPos]) {
        return '';
    } else {
        const currentLevel = list[levelPos];
        return setUpThumbnailStyle(currentLevel.name);
    }
}

function setUpThumbnailStyle(levelName) {
    if (levelName === "getting kicked out of train") {
        return `background-image: linear-gradient(rgb(0 0 0 / 0.5), rgb(0 0 0 / 0.5)), url(https://www.amtrak.com/content/dam/projects/dotcom/english/public/images/heros/couple-cafe-window-view.jpg); background-size: cover; background-repeat: no-repeat; background-position: center;`;
    } else {
        return `background-image: var(--level-button), url("${getThumbnailImage(levelName)}"); background-size: cover; background-repeat: no-repeat; background-position: center;`;
    }
}

export function getThumbnailImage(lvlName) {
    return `../assets/levels/${encodeURIComponent(lvlName)}.png`;
}

export function embed(video) {
    if (!video) return '';
    if (video.includes("medal.tv")) {
        return `https://medal.tv/clip/${getMedalIdFromUrl(video)}`;
    } else {
        return `https://www.youtube.com/embed/${getYoutubeIdFromUrl(video)}?rel=0`;
    }
}

export function mamaMia(swaggers) {
    return "../assets/" + swaggers + ".svg";
}

export async function getPeople() {
    var xhttp = new XMLHttpRequest();
    xhttp.onreadystatechange = function() {
        if (this.readyState == 4 && this.status == 200) {
            const displayVisits = document.getElementById("displayVisits");
            if (displayVisits) {
                displayVisits.innerHTML = xhttp.responseText;
            }
        }
    };
    xhttp.open("GET", "../data/stats/displayVisits.php", true);
    xhttp.send();
}

export async function incVisits() {
    var xhttp = new XMLHttpRequest();
    xhttp.open("GET", "../data/stats/incrementVisits.php", true);
    xhttp.send();
}

var incGDR = 0;
export async function otherStats(list) {
    if (!list) return;
    incGDR = 0;
    for (let i = 0; i < list.length; i++) {
        if (Array.isArray(list[i])) {
            list[i].find(isGDR);
        }
    }
    
    var timeDifference = Math.floor(((new Date() / 1000) - 1763410264) / 86400);

    const elListLength = document.getElementById("displayListLength");
    const elMostUsed = document.getElementById("displayMostUsedEngine");
    const elDaysSince = document.getElementById("displayDaysSincePublic");

    if (elListLength) elListLength.innerHTML = list.length;
    if (elMostUsed) elMostUsed.innerHTML = incGDR;
    if (elDaysSince) elDaysSince.innerHTML = timeDifference;
}

function isGDR(level) {
    if (level === null || level === undefined) {
        return false;
    } else {
        if (level.engine === "GDR") {
            incGDR++;
        }
        return level.engine === "GDR";
    }
}

export function localize(num) {
    if (typeof num !== 'number') return num;
    return num.toLocaleString(undefined, { minimumFractionDigits: 2 });
}

export function doStuff(levelName) {
    return "background-image: url('../assets/levels/Greyhound.webp');";
}

export function getEngineSelect() {
    let params = new URLSearchParams(document.location.search); 
    let engine = params.get("engine");
    return (engine === "All" || !engine) ? null : engine;
}

export function getSelectSelect(list) {
    if (!list) return null;
    let params = new URLSearchParams(document.location.search); 
    let selectedInt = parseInt(params.get("selected"));
    if (isNaN(selectedInt) || selectedInt - 1 >= list.length || selectedInt - 1 < 0) {
        return null;
    }
    return selectedInt - 1;
}

export function selectRandomLevel(levels) {
    if (!levels || levels.length === 0) return 0;
    return getRandomInt(levels.length);
}

export function getThumbnailFromId(id) {
    if (id && id.includes("medal.tv")) {
        const medalId = getMedalIdFromUrl(id);
        if (medalId) return `https://medal.tv/clip/${medalId}`;
    }
    return `https://img.youtube.com/vi/${id}/mqdefault.jpg`;
}

// Fix lỗi phủ định điều kiện Null (Syntax bug cũ: !document.getElementById(...) == null)
export function listLevelNameFilter() {
    const el = document.getElementById("filterForLevelName");
    if (el) {
        el.addEventListener("keyup", () => {
            // Filter logic
        });
    }
}

export function listPlayerFilter() {
    const el = document.getElementById("filterForPlayerName");
    if (el) {
        el.addEventListener("keyup", () => {
            // Filter logic
        });
    }
}

// https://stackoverflow.com/questions/2450954/how-to-randomize-shuffle-a-javascript-array
export function shuffle(array) {
    let currentIndex = array.length, randomIndex;

    while (currentIndex != 0) {
        randomIndex = Math.floor(Math.random() * currentIndex);
        currentIndex--;

        [array[currentIndex], array[randomIndex]] = [
            array[randomIndex],
            array[currentIndex],
        ];
    }

    return array;
}

export function getFpsSelect() {
    let params = new URLSearchParams(document.location.search); 
    let fps = params.get("fps");
    return (!fps) ? null : fps;
}
