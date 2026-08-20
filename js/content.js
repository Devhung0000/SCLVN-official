import { round, score } from './score.js';
import {
    db, doc, getDoc, getDocs, collection
} from './firebase-init.js';

export async function fetchList() {
    let params = new URLSearchParams(document.location.search);
    let whichList = params.get("list");
    let orderId = "list";
    if (whichList === "challenge") orderId = "challenge-list";
    else if (whichList === "nsgdc") orderId = "nsgdc-list";
    else if (whichList === "maybenew") orderId = "maybenewlist";

    try {
        const orderSnap = await getDoc(doc(db, "meta", orderId));
        if (!orderSnap.exists()) throw new Error("missing order doc");
        
        const data = orderSnap.data();
        const order = data.order || data.data || data.list || [];

        return await Promise.all(
            order.map(async (levelId, rank) => {
                try {
                    const levelSnap = await getDoc(doc(db, "levels", levelId));
                    if (!levelSnap.exists()) throw new Error("missing level");
                    const level = levelSnap.data();
                    return [
                        {
                            ...level,
                            path: levelId,
                            records: (level.records || [])
                                .slice()
                                .sort((a, b) => b.percent - a.percent),
                        },
                        null,
                    ];
                } catch {
                    console.error(`Failed to load level #${rank + 1} ${levelId}.`);
                    return [null, levelId];
                }
            }),
        );
    } catch (err) {
        console.error(`Failed to load list:`, err);
        return null;
    }
}

export async function fetchPacks() {
    try {
        const orderSnap = await getDoc(doc(db, "meta", "packOrder"));
        if (!orderSnap.exists()) return [];
        const data = orderSnap.data();
        const order = data.order || data.data || [];

        return await Promise.all(
            order.map(async (packId, rank) => {
                try {
                    const packSnap = await getDoc(doc(db, "packs", packId));
                    if (!packSnap.exists()) throw new Error("missing pack");
                    return [{ ...packSnap.data() }, null];
                } catch {
                    console.error(`Failed to load pack #${rank + 1} ${packId}.`);
                    return [null, packId];
                }
            }),
        );
    } catch {
        console.error(`Failed to load packs.`);
        return null;
    }
}

export async function fetchEditors() {
    try {
        const snap = await getDoc(doc(db, "meta", "editors"));
        if (!snap.exists()) return null;
        const data = snap.data();
        return data.data || data.editors || data.list || null;
    } catch {
        return null;
    }
}

export async function fetchPlayers() {
    try {
        const snap = await getDocs(collection(db, "players"));
        return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    } catch {
        return null;
    }
}

export const fetchSwagger = fetchPlayers;

export async function fetchScratchIds() {
    try {
        const snap = await getDoc(doc(db, "meta", "scratchIds"));
        if (!snap.exists()) return null;
        const data = snap.data();
        return data.ids || data.data || null;
    } catch {
        return null;
    }
}

export async function fetchWhichLeaderboard() {
    let params = new URLSearchParams(document.location.search);
    if (!params.get("type")) {
        return await fetchLeaderboard();
    }
    let whichLeaderboard = params.get("type").toLowerCase() || "h";
    if (whichLeaderboard == 'creator') {
        return await fetchCreatorLeaderboard();
    } else {
        return await fetchLeaderboard();
    }
}

export async function fetchLeaderboard() {
    const list = await fetchList();
    if (!list) return [[], []];

    const scoreMap = {};
    const errs = [];
    list.forEach(([level, err], rank) => {
        if (err) {
            errs.push(err);
            return;
        }

        const verifier = Object.keys(scoreMap).find(
            (u) => u.trim().toLowerCase() === level.verifier.trim().toLowerCase(),
        ) || level.verifier.trim();

        scoreMap[verifier] ??= {
            verified: [],
            completed: [],
            progressed: [],
            created: [],
        };
        const { verified } = scoreMap[verifier];
        verified.push({
            rank: rank + 1,
            level: level.name,
            score: score(rank + 1, 100, level.percentToQualify),
            link: level.verification,
        });

        level.records.forEach((record) => {
            const user = Object.keys(scoreMap).find(
                (u) => u.trim().toLowerCase() === record.user.trim().toLowerCase(),
            ) || record.user.trim();

            scoreMap[user] ??= {
                verified: [],
                completed: [],
                progressed: [],
                created: [],
            };
            const { completed, progressed } = scoreMap[user];
            if (record.percent === 100) {
                completed.push({
                    rank: rank + 1,
                    level: level.name,
                    score: score(rank + 1, 100, level.percentToQualify),
                    link: record.link,
                });
                return;
            }

            progressed.push({
                rank: rank + 1,
                level: level.name,
                percent: record.percent,
                score: score(rank + 1, record.percent, level.percentToQualify),
                link: record.link,
            });
        });
    });

    const res = Object.entries(scoreMap).map(([user, scores]) => {
        const { created, verified, completed, progressed } = scores;
        const total = [created, verified, completed, progressed]
            .flat()
            .reduce((prev, cur) => prev + cur.score, 0);

        return {
            user,
            total: round(total),
            ...scores,
        };
    });

    return [res.sort((a, b) => b.total - a.total), errs];
}

export async function fetchCreatorLeaderboard() {
    const list = await fetchList();
    if (!list) return [[], []];

    const scoreMap = {};
    const errs = [];
    list.forEach(([level, err], rank) => {
        if (err) {
            errs.push(err);
            return;
        }

        const verifier = Object.keys(scoreMap).find(
            (u) => u.trim().toLowerCase() === level.verifier.trim().toLowerCase(),
        ) || level.verifier.trim();

        scoreMap[verifier] ??= {
            verified: [],
            completed: [],
            progressed: [],
            created: [],
        };
        const { verified } = scoreMap[verifier];
        verified.push({
            rank: rank + 1,
            level: level.name,
            score: 0,
            link: level.verification,
        });

        level.records.forEach((record) => {
            const user = Object.keys(scoreMap).find(
                (u) => u.trim().toLowerCase() === record.user.trim().toLowerCase(),
            ) || record.user.trim();

            scoreMap[user] ??= {
                verified: [],
                completed: [],
                progressed: [],
                created: [],
            };
            const { completed, progressed } = scoreMap[user];
            if (record.percent === 100) {
                completed.push({
                    rank: rank + 1,
                    level: level.name,
                    score: score(rank + 1, 100, level.percentToQualify),
                    link: record.link,
                });
                return;
            }

            progressed.push({
                rank: rank + 1,
                level: level.name,
                percent: record.percent,
                score: score(rank + 1, record.percent, level.percentToQualify),
                link: record.link,
            });
        });

        for (let index = 0; index < level.creators.length; index++) {
            const creator = Object.keys(scoreMap).find(
                (u) => u.trim().toLowerCase() === level.creators[index].trim().toLowerCase(),
            ) || level.creators[index].trim();

            scoreMap[creator] ??= {
                verified: [],
                completed: [],
                progressed: [],
                created: [],
            };
            const { created } = scoreMap[creator];
            created.push({
                rank: rank + 1,
                level: level.name,
                score: 1,
                link: level.verification,
            });
        }
    });

    const res = Object.entries(scoreMap).map(([user, scores]) => {
        const { created, verified, completed, progressed } = scores;
        const total = [created, verified, completed, progressed]
            .flat()
            .reduce((prev, cur) => prev + cur.score, 0);

        return {
            user,
            total: round(total),
            ...scores,
        };
    });

    return [res.sort((a, b) => b.total - a.total), errs];
}

export async function fetchScratchPFPs() {
    const list = await fetchList();
    if (!list) return [[], []];

    const scoreMap = {};
    const errs = [];
    list.forEach(([level, err], rank) => {
        if (err) {
            errs.push(err);
            return;
        }
        for (let index = 0; index < level.creators.length; index++) {
            const creator = Object.keys(scoreMap).find(
                (u) => u.trim().toLowerCase() === level.creators[index].trim().toLowerCase(),
            ) || level.creators[index].trim();

            scoreMap[creator] ??= {
                verified: [],
                completed: [],
                progressed: [],
            };
            const { verified } = scoreMap[creator];
            verified.push({
                rank: rank + 1,
                level: level.name,
                score: 1,
                link: level.verification,
            });
        }
    });

    const res = Object.entries(scoreMap).map(([user, scores]) => {
        const { verified, completed, progressed } = scores;
        const total = [verified, completed, progressed]
            .flat()
            .reduce((prev, cur) => prev + cur.score, 0);

        return {
            user,
            total: round(total),
            ...scores,
        };
    });

    return [res.sort((a, b) => b.total - a.total), errs];
}
