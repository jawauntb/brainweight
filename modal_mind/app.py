"""Deep clock plus one L4 mass run: 9.4e6 W+T units (motif plus a tiny transformer)."""
import os
import time
from pathlib import Path

import modal

GRAPH_PATH = "/root/fly-deep.json"
CX_PATH = "/root/fly-cx.json"
LOCAL_GRAPH = Path(__file__).parent / "fly-deep.json"
LOCAL_CX = Path(__file__).resolve().parent.parent / "public" / "data" / "fly-cx.json"

HUMAN_G = 1508.0
MOTIF_FULL = 18850000
TARGET_COPIES = 9425000
FLY_WET_G = HUMAN_G / MOTIF_FULL
FLY_NEURON_CELL = 0.918
TISSUE = 0.05
GLIA_ALPHA = 1.15
HUMAN_GLIA = 0.5
T_MIX = 0.18
T_D = 8
T_FF = 16
TILE_T = 16000

# Same frozen T as public/loop.js tWeights(). Pairing is the 50% cut, not grams.
_T_WQ = [0.33510501245036717, 0.08705933287274092, 0.30781486493069676, -0.3060399656416848, -0.3071414527948946, 0.1281292021740228, -0.06995674674399197, 0.2051611378090456]
_T_WK = [0.24839564834255723, -0.05943892414215952, -0.28005316758062687, -0.26252109240740534, -0.2835647501051426, -0.2972797865048051, -0.30749346485827117, 0.030487450794316827]
_T_WV = [0.2707623783731833, -0.17213104257825762, -0.05712233041413128, -0.17588133425451813, -0.18294427427463233, -0.21312491183634846, -0.23010505374986676, -0.040834572981111705]
_T_PX = [-0.0139865736477077, -0.09197954194620252, 0.10318189077079296, -0.07120491497218609, 0.11148287974298, 0.106649079490453, 0.10209578348323703, -0.056999946143478156]
_T_PY = [-0.0971928665600717, 0.05032844457775354, 0.007510118745267391, 0.07458367746323347, -0.09444423029199242, 0.0038190936483442784, 0.10872872879728675, -0.06467266649007797]
_T_W1 = [-0.10027466095983982, 0.03847245216369629, 0.0537106940895319, -0.20295137437991798, 0.09287880691699683, -0.01736509590409696, -0.1057919499464333, 0.2137364518083632, -0.14356359345838426, 0.1902703335788101, -0.05954345441423357, -0.030286318296566604, -0.1399078429862857, 0.16283068370074033, -0.03514983084052801, -0.20273432723246515, 0.1458831866271794, 0.11184695089235902, 0.09258292643353343, 0.1426752002630383, -0.1633891032729298, 0.15672910939902068, 0.000513046570122242, -0.009648002125322819, -0.1566809035744518, 0.12054138421081007, 0.002219402613118291, -0.047928460594266656, 0.1286734596453607, -0.06927492471411824, -0.21220982898958027, -0.13226638081483544, -0.18535337399691343, -0.03361993785947561, -0.16872663178481162, -0.19472565363161265, -0.08019767903722823, -0.052865667808800934, 0.2108007465861738, -0.09099636061117053, -0.20770469482056797, 0.1723258839827031, -0.08840523302555084, -0.21853285528719427, -0.20202240601181984, -0.146640159888193, -0.1604770498443395, -0.08095937616191805, 0.02266882160678506, -0.14929567056708037, -0.18420984585769476, 0.02181019046343863, -0.08251871064305305, 0.14979356043040754, -0.07587240010499954, 0.08944378363899887, -0.07094062014482916, -0.1207009690720588, -0.025218095090240242, 0.1710466247983277, -0.030591107849031688, -0.14658028296194972, 0.10509266844950617, 0.13298863028176128, -0.13574449256062507, -0.14536180458031595, 0.1553072444628924, -0.10611505029723048, -0.13542468747124076, -0.1674323104508221, -0.1997157087828964, 0.20605820535682143, 0.035920512946322564, -0.21304220970720053, -0.07644727129489183, -0.18504853148013353, 0.1504626332130283, -0.06372672679834068, -0.028508031079545616, 0.06202423622831702, 0.020780660277232528, 0.002694666879251599, 0.1650448568817228, -0.02692233081907034, 0.07410043049603701, -0.20100293699651955, 0.15668128405697643, 0.18400195590220392, -0.14109862031415105, -0.12629551107063888, 0.08898840250447393, -0.07546818475238978, -0.08770435747690498, -0.12225948347710074, 0.10285322524607182, -0.02567314952611923, -0.053091299990192055, -0.09220126732252538, 0.002164654415100813, 0.06430259549990297, 0.20080856697633861, 0.2126710125338286, 0.1221716391388327, 0.12258180032484234, -0.039035490080714226, -0.0912150077521801, 0.011410591825842857, -0.07649993001483381, 0.0604649134259671, 0.07189796591177583, 0.06526633130386472, -0.04997010359540582, -0.1790418162662536, 0.027990717142820358, 0.2115997449308634, -0.1515951347351074, 0.16157439791597425, 0.017949860049411653, -0.01683651122264564, -0.18590274875983595, -0.039309332389384506, -0.034242386166006326, 0.050002369722351434, -0.11566168087534606, 0.15585359483025968, -0.00012393895536661148, -0.08012553457170725, 0.1989328645542264]
_T_W2 = [0.20397712852805852, -0.07235290233045817, -0.08993501003831625, -0.03536600607447326, 0.16533607660792768, 0.17521443949081003, 0.10880856825038791, 0.11214593270793558, 0.058188777836039665, -0.07018552337773144, -0.09494234702549875, 0.18361626863479613, 0.010677055940032005, -0.12054165825247765, 0.015292772529646755, 0.07451074750162662]

image = (
    modal.Image.debian_slim(python_version="3.11")
    .pip_install("numpy", "torch", "fastapi")
    .add_local_file(str(LOCAL_GRAPH), GRAPH_PATH)
    .add_local_file(str(LOCAL_CX), CX_PATH)
)

app = modal.App("brainweight-mind", image=image)

_cache = {"g": None, "src": None, "dst": None, "w": None, "ports": None, "state": None}
_cx = {"g": None, "src": None, "dst": None, "w": None, "templates": None, "epg": None}
_mass_live = {"v": None, "N": None, "steps": 0, "target": None}


def _load():
    if _cache["g"] is not None:
        return
    import json
    import torch

    g = json.loads(Path(GRAPH_PATH).read_text())
    src = torch.tensor([e["s"] for e in g["edges"]], dtype=torch.long)
    dst = torch.tensor([e["t"] for e in g["edges"]], dtype=torch.long)
    w = torch.tensor([e["w"] * e["sign"] * 0.072 for e in g["edges"]], dtype=torch.float32)
    _cache["g"] = g
    _cache["src"] = src
    _cache["dst"] = dst
    _cache["w"] = w
    _cache["ports"] = g.get("ports") or {}
    _cache["state"] = {}


def _port(species):
    ports = _cache["ports"]
    return ports.get(species) or ports.get("_") or {"sensors": [], "readouts": [], "k": 4}


def _init_v(torch, n, seeds):
    B = len(seeds)
    v = torch.zeros((B, n), dtype=torch.float32)
    nodes = _cache["g"]["nodes"]
    epg = [nd["i"] for nd in nodes if nd["type"] == "EPG"]
    if not epg:
        epg = [0]
    for b, seed in enumerate(seeds):
        bump = epg[int(seed * len(epg)) % len(epg)]
        bx, by = nodes[bump]["x"], nodes[bump]["y"]
        for i, nd in enumerate(nodes):
            dx = nd["x"] - bx
            dy = nd["y"] - by
            v[b, i] = 0.42 * torch.exp(torch.tensor(-3.2 * (dx * dx + dy * dy)))
    return v


def _step(minds, frame):
    import torch

    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    g = _cache["g"]
    n = len(g["nodes"])
    B = len(minds)
    src = _cache["src"].to(device)
    dst = _cache["dst"].to(device)
    w = _cache["w"].to(device)
    key = f"{B}"
    st = _cache["state"]
    if st.get("key") != key or st.get("v") is None or st["v"].shape[0] != B:
        seeds = [float(m.get("seed") or 0.37) for m in minds]
        v = _init_v(torch, n, seeds).to(device)
        st["key"] = key
        st["v"] = v
    else:
        v = st["v"]

    inj = torch.zeros((B, n), dtype=torch.float32, device=device)
    for i, m in enumerate(minds):
        port = _port(m.get("species") or "")
        drive = float(m.get("drive") or 0)
        if port.get("pulse"):
            import math
            drive += 0.16 * math.sin((frame or 0) * 0.08)
        idx = port.get("sensors") or []
        if idx:
            inj[i, idx] = 0.075 * drive
    v = (v + inj).clamp(-1, 1)

    ks = [int(m.get("k") or _port(m.get("species") or "").get("k", 4)) for m in minds]
    k_max = max(ks) if ks else 4
    dst_exp = dst.unsqueeze(0).expand(B, -1)
    live_k = torch.tensor(ks, device=device).unsqueeze(1)
    for k in range(k_max):
        act = torch.tanh(v.index_select(1, src)) * w
        act = act * (live_k > k).to(v.dtype)
        inc = torch.zeros_like(v)
        inc.scatter_add_(1, dst_exp, act)
        v = v * 0.80 + inc
        v = v - v.mean(dim=1, keepdim=True) * 0.40
        v = v.clamp(-1, 1)
    st["v"] = v

    out = []
    energy = v.abs().mean(dim=1)
    for i, m in enumerate(minds):
        port = _port(m.get("species") or "")
        ridx = port.get("readouts") or []
        if ridx:
            rv = v[i, ridx]
            readout = float(rv.mean().item())
            peak = float(rv.abs().max().item())
        else:
            readout = 0.0
            peak = 0.0
        e = float(energy[i].item())
        out.append({
            "readout": readout,
            "e": e,
            "thought": max(0.0, min(1.0, (peak - e) * 1.35)),
            "k": ks[i],
        })
    return out


def _load_cx():
    if _cx["g"] is not None:
        return
    import json
    import torch

    g = json.loads(Path(CX_PATH).read_text())
    nodes = g["nodes"]
    src = torch.tensor([e["s"] for e in g["edges"]], dtype=torch.long)
    dst = torch.tensor([e["t"] for e in g["edges"]], dtype=torch.long)
    w = torch.tensor([e["w"] * e["sign"] * 0.072 for e in g["edges"]], dtype=torch.float32)
    epg = [nd["i"] for nd in nodes if nd["type"] == "EPG"]
    if not epg:
        epg = [0]
    templates = []
    for bump in epg:
        bx, by = nodes[bump]["x"], nodes[bump]["y"]
        row = []
        for nd in nodes:
            dx = nd["x"] - bx
            dy = nd["y"] - by
            row.append(0.42 * float(torch.exp(torch.tensor(-3.2 * (dx * dx + dy * dy)))))
        templates.append(row)
    _cx["g"] = g
    _cx["src"] = src
    _cx["dst"] = dst
    _cx["w"] = w
    _cx["epg"] = epg
    _cx["templates"] = torch.tensor(templates, dtype=torch.float32)
    _cx["px"] = torch.tensor([nd["x"] for nd in nodes], dtype=torch.float32)
    _cx["py"] = torch.tensor([nd["y"] for nd in nodes], dtype=torch.float32)
    _cx["t"] = None


def _t_weights(device):
    import torch

    cached = _cx.get("t")
    if cached is not None and cached["Wq"].device == device:
        return cached
    tw = {
        "Wq": torch.tensor(_T_WQ, dtype=torch.float32, device=device),
        "Wk": torch.tensor(_T_WK, dtype=torch.float32, device=device),
        "Wv": torch.tensor(_T_WV, dtype=torch.float32, device=device),
        "Px": torch.tensor(_T_PX, dtype=torch.float32, device=device),
        "Py": torch.tensor(_T_PY, dtype=torch.float32, device=device),
        "W1": torch.tensor(_T_W1, dtype=torch.float32, device=device).reshape(T_D, T_FF),
        "W2": torch.tensor(_T_W2, dtype=torch.float32, device=device),
    }
    _cx["t"] = tw
    return tw


def _apply_t_tile(sl, px, py, tw):
    import math
    import torch

    act = sl.unsqueeze(-1)
    q = act * tw["Wq"] + px.unsqueeze(-1) * tw["Px"] + py.unsqueeze(-1) * tw["Py"]
    k = act * tw["Wk"] + px.unsqueeze(-1) * tw["Px"] + py.unsqueeze(-1) * tw["Py"]
    vp = act * tw["Wv"]
    scores = torch.matmul(q, k.transpose(-1, -2)) * (1.0 / math.sqrt(T_D))
    attn = torch.softmax(scores, dim=-1)
    ctx = torch.matmul(attn, vp)
    hid = torch.relu(torch.matmul(ctx, tw["W1"]))
    y = torch.matmul(hid, tw["W2"])
    return (sl * (1.0 - T_MIX) + T_MIX * torch.tanh(y)).clamp(-1, 1)


def _pearson_rows(a, b):
    import torch

    a = a - a.mean(dim=1, keepdim=True)
    b = b - b.mean(dim=1, keepdim=True)
    num = (a * b).sum(dim=1)
    den = a.norm(dim=1) * b.norm(dim=1)
    r = num / den.clamp_min(1e-12)
    return r.clamp(-1, 1)


def _run_mass(N, K, target=0.0, glia_frac=HUMAN_GLIA):
    import math
    import torch

    N = TARGET_COPIES
    _load_cx()
    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    g = _cx["g"]
    n = len(g["nodes"])
    src = _cx["src"].to(device)
    dst = _cx["dst"].to(device)
    w = _cx["w"].to(device)
    templates = _cx["templates"].to(device)
    px = _cx["px"].to(device)
    py = _cx["py"].to(device)
    tw = _t_weights(device)
    epg = _cx["epg"]
    nodes = g["nodes"]
    live = _mass_live
    if live["v"] is not None and live["N"] == N and live["v"].shape[0] == N:
        v = live["v"]
        if live["target"] is None or abs(float(live["target"]) - float(target)) > 1e-4:
            bx = math.cos(target)
            by = math.sin(target)
            cue = torch.tensor(
                [math.exp(-3.2 * ((nd["x"] - bx) ** 2 + (nd["y"] - by) ** 2)) for nd in nodes],
                dtype=torch.float32,
                device=device,
            )
            v = (v * 0.38 + 0.42 * cue).clamp(-1, 1)
            live["target"] = target
    else:
        pick = (torch.arange(N, device=device) * 7 + 3) % templates.shape[0]
        v = templates.index_select(0, pick)
        bx = math.cos(target)
        by = math.sin(target)
        cue = torch.tensor(
            [math.exp(-3.2 * ((nd["x"] - bx) ** 2 + (nd["y"] - by) ** 2)) for nd in nodes],
            dtype=torch.float32,
            device=device,
        )
        v = (v * 0.38 + 0.42 * cue).clamp(-1, 1)
        live["N"] = N
        live["steps"] = 0
        live["target"] = target
    pred = v[-1].clone()
    g_field = 0.0
    gain_scale = 1.0
    tile = 200000 if N > 200000 else N
    for _ in range(K):
        v = v + 0.12 * torch.roll(v, 1, 0)
        nbr = 0.5 * (torch.roll(v, 1, 0) + torch.roll(v, -1, 0))
        v = v + TISSUE * (nbr - v)
        inc = torch.zeros_like(v)
        for start in range(0, N, tile):
            end = min(start + tile, N)
            sl = v[start:end]
            mean_abs = float(sl.abs().mean().item())
            g_field = max(0.0, min(1.0, mean_abs - 0.18))
            gain_scale = 1.0 + GLIA_ALPHA * glia_frac * g_field
            act = torch.tanh(sl.index_select(1, src)) * (w * gain_scale)
            dest = dst.unsqueeze(0).expand(end - start, -1)
            inc[start:end].scatter_add_(1, dest, act)
        v = v * 0.80 + inc
        v = v - v.mean(dim=1, keepdim=True) * 0.40
        v = v.clamp(-1, 1)
        del inc
        t_tile = TILE_T if N > TILE_T else N
        for start in range(0, N, t_tile):
            end = min(start + t_tile, N)
            v[start:end] = _apply_t_tile(v[start:end], px, py, tw)
    live["v"] = v
    live["N"] = N
    live["steps"] = int(live.get("steps") or 0) + K
    residual = float(torch.sqrt(((pred - v[0]) ** 2).mean()).item())
    if N < 2:
        corr = 1.0
        intf = 0.0
        wave = 0.0
        order = 0.0
        regime = "noN"
    else:
        sample = min(4096, N - 1)
        idx = (torch.arange(sample, device=device) * (N - 2) // max(sample - 1, 1)).clamp(0, N - 2)
        a = v.index_select(0, idx)
        b = v.index_select(0, idx + 1)
        corr = float(_pearson_rows(a, b).mean().item())
        intf = float((a * b).mean().item())
        epg_x = torch.tensor([nodes[i]["x"] for i in epg], device=device)
        epg_y = torch.tensor([nodes[i]["y"] for i in epg], device=device)
        epg_i = torch.tensor(epg, device=device, dtype=torch.long)
        take = min(512, N)
        samp_i = (torch.arange(take, device=device) * (N - 1) // max(take - 1, 1)).clamp(0, N - 1)
        samp = v.index_select(0, samp_i)
        sx = (samp.index_select(1, epg_i) * epg_x).sum(dim=1)
        sy = (samp.index_select(1, epg_i) * epg_y).sum(dim=1)
        heading = torch.atan2(sy, sx)
        dH = heading[1:] - heading[:-1]
        dH = (dH + torch.pi) % (2 * torch.pi) - torch.pi
        wave = float(dH.abs().mean().item()) if dH.numel() else 0.0
        order = float((sx[0].square() + sy[0].square()).sqrt().item() / max(len(epg), 1))
        if order > 1:
            order = 1.0
        if corr < 0.38:
            regime = "fission"
        elif order > 0.22 and intf < -0.04:
            regime = "cancel"
        elif order > 0.22 and wave > 0.035 and intf > 0.04:
            regime = "analog"
        elif order > 0.22 and wave > 0.035:
            regime = "wave"
        elif residual > 0.10:
            regime = "lie"
        elif order > 0.30:
            regime = "heading"
        elif corr > 0.75:
            regime = "agree"
        else:
            regime = "idle"
    epg_i0 = torch.tensor(epg, device=device, dtype=torch.long)
    epg_x0 = torch.tensor([nodes[i]["x"] for i in epg], device=device)
    epg_y0 = torch.tensor([nodes[i]["y"] for i in epg], device=device)
    h0 = v[0].index_select(0, epg_i0)
    sx0 = float((h0 * epg_x0).sum().item())
    sy0 = float((h0 * epg_y0).sum().item())
    heading0 = math.atan2(sy0, sx0)
    err = target - heading0
    while err > math.pi:
        err -= 2 * math.pi
    while err < -math.pi:
        err += 2 * math.pi
    score = (1.0 + math.cos(err)) / 2.0
    if score > 0.88:
        regime = "acquire"
    elif score < 0.22 and order > 0.16:
        regime = "miss"
    mass_g = HUMAN_G * (N / MOTIF_FULL)
    neuron_g = mass_g * FLY_NEURON_CELL
    tissue_g = mass_g - neuron_g
    return {
        "ok": True,
        "gpu": bool(torch.cuda.is_available()),
        "device": "L4" if torch.cuda.is_available() else "cpu",
        "mode": "mass",
        "N": N,
        "K": K,
        "n": n,
        "e": len(g["edges"]),
        "dataset": g.get("dataset"),
        "motif": True,
        "pair": True,
        "estimate": "wet mass from Zheng volume; pairing is not a weighing",
        "target_copies": TARGET_COPIES,
        "motif_full": MOTIF_FULL,
        "mass_g": mass_g,
        "neuron_g": neuron_g,
        "tissue_g": tissue_g,
        "human_g": HUMAN_G,
        "fraction": 1.0 if N == TARGET_COPIES else N / TARGET_COPIES,
        "motif_frac": N / MOTIF_FULL,
        "residual": residual,
        "corr": corr,
        "intf": intf,
        "wave": wave,
        "order": order,
        "regime": regime,
        "heading": heading0,
        "target": target,
        "error": err,
        "score": score,
        "g": g_field,
        "gain": 0.072 * gain_scale,
        "glia_frac": glia_frac,
        "steps": live["steps"],
        "live": True,
    }


@app.function(
    gpu="L4",
    timeout=600,
    scaledown_window=600,
    secrets=[modal.Secret.from_name("brainweight-think")],
)
@modal.fastapi_endpoint(method="POST")
def think(body: dict):
    token = (body or {}).get("token") or ""
    if token != os.environ.get("THINK_TOKEN", ""):
        return {"ok": False, "error": "unauthorized"}
    if (body or {}).get("mode") == "mass":
        N = TARGET_COPIES
        K = int((body or {}).get("K") or 4)
        K = max(1, min(K, 16))
        target = float((body or {}).get("target") or 0.0)
        glia_frac = float((body or {}).get("glia_frac") or HUMAN_GLIA)
        if glia_frac < 0:
            glia_frac = 0.0
        if glia_frac > 1:
            glia_frac = 1.0
        t0 = time.time()
        out = _run_mass(N, K, target, glia_frac)
        out["ms"] = round((time.time() - t0) * 1000, 1)
        return out
    minds = (body or {}).get("minds") or []
    if not minds or len(minds) > 16:
        return {"ok": False, "error": "bad-batch"}
    t0 = time.time()
    _load()
    outs = _step(minds, (body or {}).get("frame") or 0)
    ms = (time.time() - t0) * 1000
    g = _cache["g"]
    return {
        "ok": True,
        "gpu": True,
        "device": "L4",
        "n": len(g["nodes"]),
        "e": len(g["edges"]),
        "dataset": g.get("dataset"),
        "ms": round(ms, 1),
        "minds": outs,
    }


@app.function(timeout=40, scaledown_window=60)
@modal.fastapi_endpoint(method="GET")
def status():
    _load()
    g = _cache["g"]
    return {
        "ok": True,
        "n": len(g["nodes"]),
        "e": len(g["edges"]),
        "dataset": g.get("dataset"),
        "gpu": "L4",
        "target_copies": TARGET_COPIES,
        "motif_full": MOTIF_FULL,
        "pair": True,
        "human_g": HUMAN_G,
        "fly_wet_g": FLY_WET_G,
    }
