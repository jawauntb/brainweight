"""Deep clock plus one L4 mass run: 1.9e7 copies of the 47-cell motif."""
import os
import time
from pathlib import Path

import modal

GRAPH_PATH = "/root/fly-deep.json"
CX_PATH = "/root/fly-cx.json"
LOCAL_GRAPH = Path(__file__).parent / "fly-deep.json"
LOCAL_CX = Path(__file__).resolve().parent.parent / "public" / "data" / "fly-cx.json"

HUMAN_G = 1508.0
TARGET_COPIES = 18850000
FLY_WET_G = HUMAN_G / TARGET_COPIES
FLY_NEURON_CELL = 0.918
TISSUE = 0.05

image = (
    modal.Image.debian_slim(python_version="3.11")
    .pip_install("numpy", "torch", "fastapi")
    .add_local_file(str(LOCAL_GRAPH), GRAPH_PATH)
    .add_local_file(str(LOCAL_CX), CX_PATH)
)

app = modal.App("brainweight-mind", image=image)

_cache = {"g": None, "src": None, "dst": None, "w": None, "ports": None, "state": None}
_cx = {"g": None, "src": None, "dst": None, "w": None, "templates": None, "epg": None}
_mass_last = None


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


def _pearson_rows(a, b):
    import torch

    a = a - a.mean(dim=1, keepdim=True)
    b = b - b.mean(dim=1, keepdim=True)
    num = (a * b).sum(dim=1)
    den = a.norm(dim=1) * b.norm(dim=1)
    r = num / den.clamp_min(1e-12)
    return r.clamp(-1, 1)


def _run_mass(N, K):
    import torch

    _load_cx()
    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    g = _cx["g"]
    n = len(g["nodes"])
    src = _cx["src"].to(device)
    dst = _cx["dst"].to(device)
    w = _cx["w"].to(device)
    templates = _cx["templates"].to(device)
    epg = _cx["epg"]
    pick = (torch.arange(N, device=device) * 7 + 3) % templates.shape[0]
    v = templates.index_select(0, pick)
    pred = v[-1].clone()
    tile = 200000 if N > 200000 else N
    for _ in range(K):
        v = v + 0.12 * torch.roll(v, 1, 0)
        nbr = 0.5 * (torch.roll(v, 1, 0) + torch.roll(v, -1, 0))
        v = v + TISSUE * (nbr - v)
        inc = torch.zeros_like(v)
        for start in range(0, N, tile):
            end = min(start + tile, N)
            sl = v[start:end]
            act = torch.tanh(sl.index_select(1, src)) * w
            dest = dst.unsqueeze(0).expand(end - start, -1)
            inc[start:end].scatter_add_(1, dest, act)
        v = v * 0.80 + inc
        v = v - v.mean(dim=1, keepdim=True) * 0.40
        v = v.clamp(-1, 1)
        del inc
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
        nodes = g["nodes"]
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
    mass_g = HUMAN_G if N == TARGET_COPIES else HUMAN_G * (N / TARGET_COPIES)
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
        "estimate": "wet mass from Zheng volume",
        "target_copies": TARGET_COPIES,
        "mass_g": mass_g,
        "neuron_g": neuron_g,
        "tissue_g": tissue_g,
        "human_g": HUMAN_G,
        "fraction": 1.0 if N == TARGET_COPIES else N / TARGET_COPIES,
        "residual": residual,
        "corr": corr,
        "intf": intf,
        "wave": wave,
        "order": order,
        "regime": regime,
    }


@app.function(
    gpu="L4",
    timeout=600,
    scaledown_window=120,
    secrets=[modal.Secret.from_name("brainweight-think")],
)
@modal.fastapi_endpoint(method="POST")
def think(body: dict):
    global _mass_last
    token = (body or {}).get("token") or ""
    if token != os.environ.get("THINK_TOKEN", ""):
        return {"ok": False, "error": "unauthorized"}
    if (body or {}).get("mode") == "mass":
        N = int((body or {}).get("N") or TARGET_COPIES)
        N = max(1, min(N, TARGET_COPIES))
        K = int((body or {}).get("K") or 4)
        K = max(1, min(K, 16))
        cache_key = (N, K)
        if _mass_last and _mass_last.get("cache_key") == cache_key:
            return {k: v for k, v in _mass_last.items() if k != "cache_key"}
        t0 = time.time()
        out = _run_mass(N, K)
        out["ms"] = round((time.time() - t0) * 1000, 1)
        _mass_last = {**out, "cache_key": cache_key}
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
        "human_g": HUMAN_G,
        "fly_wet_g": FLY_WET_G,
    }
