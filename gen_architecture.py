"""
Génère le diagramme d'architecture Atlas Finance pour PowerPoint.
Exécuter : python gen_architecture.py
"""
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
import matplotlib.patches as mpatches
from matplotlib.patches import FancyBboxPatch, Circle, FancyArrowPatch, Wedge
import numpy as np

# ── Couleurs ──────────────────────────────────────────────────────────────────
C_BLUE    = '#0E2A47'
C_GOLD    = '#B8864A'
C_ORANGE  = '#E07B2A'
C_GREEN   = '#059669'
C_PURPLE  = '#7C3AED'
C_GREY    = '#5A6B7E'
C_LIGHT   = '#F5F0E8'
C_WHITE   = '#FFFFFF'
C_BG      = '#F0EBE0'
C_REST    = '#DC2626'

fig, ax = plt.subplots(figsize=(18, 11))
ax.set_xlim(0, 18)
ax.set_ylim(0, 11)
ax.set_facecolor(C_BG)
fig.patch.set_facecolor(C_BG)
ax.axis('off')

# ─────────────────────────────────────────────────────────────────────────────
# Helpers
# ─────────────────────────────────────────────────────────────────────────────

def rbox(x, y, w, h, fc, ec, lw=2, radius=0.35, zorder=3, alpha=1.0):
    p = FancyBboxPatch((x, y), w, h,
        boxstyle=f"round,pad=0,rounding_size={radius}",
        linewidth=lw, edgecolor=ec, facecolor=fc, alpha=alpha, zorder=zorder)
    ax.add_patch(p)

def txt(x, y, s, size=11, color=C_BLUE, bold=False, ha='center', va='center', z=5):
    ax.text(x, y, s, ha=ha, va=va, fontsize=size, color=color,
            fontweight='bold' if bold else 'normal', zorder=z)

def cloud(cx, cy, r=0.55, color='#8BAFC8', alpha=0.45):
    offs = [(-0.45,0,0.5),(0,0.25,0.42),(0.45,0.25,0.42),(0.9,0,0.5),(0.45,-0.2,0.38)]
    for dx, dy, dr in offs:
        ax.add_patch(Circle((cx+dx, cy+dy), dr, color=color, alpha=alpha, zorder=2))

def arrow(x1,y1,x2,y2, color=C_BLUE, lw=2, label='', lcolor=C_REST, bi=True, rad=0.0):
    style = '<->' if bi else '->'
    ax.annotate('', xy=(x2,y2), xytext=(x1,y1),
        arrowprops=dict(arrowstyle=style, color=color, lw=lw,
                        connectionstyle=f'arc3,rad={rad}'), zorder=4)
    if label:
        mx,my = (x1+x2)/2, (y1+y2)/2
        ax.text(mx, my+0.22, label, ha='center', va='bottom', fontsize=9,
                color=lcolor, fontweight='bold',
                bbox=dict(boxstyle='round,pad=0.18', fc=C_BG, ec='none'), zorder=6)

# ── Icône moniteur ─────────────────────────────────────────────────────────────
def icon_monitor(cx, cy, scale=1.0, color=C_BLUE):
    # Écran
    rbox(cx-0.7*scale, cy-0.45*scale, 1.4*scale, 1.0*scale, '#CBD5E1', color, lw=1.5*scale, radius=0.1*scale, zorder=4)
    # Pied
    ax.plot([cx, cx], [cy-0.45*scale, cy-0.65*scale], color=color, lw=2*scale, zorder=4)
    ax.plot([cx-0.25*scale, cx+0.25*scale], [cy-0.65*scale, cy-0.65*scale], color=color, lw=2*scale, zorder=4)
    # Intérieur écran
    rbox(cx-0.6*scale, cy-0.38*scale, 1.2*scale, 0.78*scale, '#1E3A5F', color, lw=1*scale, radius=0.05*scale, zorder=5)

# ── Icône serveur ──────────────────────────────────────────────────────────────
def icon_server(cx, cy, scale=1.0, color=C_BLUE):
    for i in range(3):
        y0 = cy - 0.55*scale + i*0.42*scale
        rbox(cx-0.55*scale, y0, 1.1*scale, 0.35*scale, '#CBD5E1', color, lw=1.5*scale, radius=0.06*scale, zorder=4)
        ax.add_patch(Circle((cx+0.32*scale, y0+0.175*scale), 0.07*scale, color=C_GREEN, zorder=5))
        ax.add_patch(Circle((cx+0.15*scale, y0+0.175*scale), 0.05*scale, color=C_GOLD, zorder=5))

# ── Icône globe ───────────────────────────────────────────────────────────────
def icon_globe(cx, cy, scale=1.0):
    ax.add_patch(Circle((cx,cy), 0.62*scale, color='#2563EB', alpha=0.85, zorder=4))
    ax.add_patch(Circle((cx,cy), 0.62*scale, color='none', ec='white', lw=1.5*scale, zorder=5))
    # Méridiens
    for ang in [30, 90, 150]:
        t = np.linspace(0, 2*np.pi, 60)
        xs = cx + 0.62*scale * np.cos(t) * np.sin(np.radians(ang))
        ys = cy + 0.62*scale * np.sin(t)
        ax.plot(xs, ys, 'w-', lw=0.8*scale, alpha=0.7, zorder=5)
    # Parallèles
    for lat in [-0.3, 0, 0.3]:
        r = 0.62*scale * np.cos(np.arcsin(lat / 0.62))
        circle = Circle((cx, cy+lat*scale), r, color='none', ec='white', lw=0.7*scale, alpha=0.7, zorder=5)
        ax.add_patch(circle)

# ── Icône IA ──────────────────────────────────────────────────────────────────
def icon_ia(cx, cy, scale=1.0, color=C_PURPLE):
    ax.add_patch(Circle((cx, cy), 0.48*scale, color='#EDE9FE', ec=color, lw=2*scale, zorder=4))
    # Circuits
    for angle in [0, 45, 90, 135, 180, 225, 270, 315]:
        rad = np.radians(angle)
        x0 = cx + 0.2*scale*np.cos(rad); y0 = cy + 0.2*scale*np.sin(rad)
        x1 = cx + 0.45*scale*np.cos(rad); y1 = cy + 0.45*scale*np.sin(rad)
        ax.plot([x0,x1],[y0,y1], color=color, lw=1.2*scale, zorder=5)
        ax.add_patch(Circle((x1,y1), 0.05*scale, color=color, zorder=5))
    ax.add_patch(Circle((cx,cy), 0.17*scale, color=color, zorder=5))
    ax.text(cx, cy, 'AI', ha='center', va='center', fontsize=8*scale,
            color='white', fontweight='bold', zorder=6)

# ── Icône admin ───────────────────────────────────────────────────────────────
def icon_admin(cx, cy, scale=1.0, color=C_ORANGE):
    # Engrenage simplifié
    ax.add_patch(Circle((cx,cy), 0.42*scale, color='#FEF3C7', ec=color, lw=2*scale, zorder=4))
    ax.add_patch(Circle((cx,cy), 0.18*scale, color=color, zorder=5))
    for a in range(0, 360, 45):
        r = np.radians(a)
        x0 = cx + 0.32*scale*np.cos(r); y0 = cy + 0.32*scale*np.sin(r)
        x1 = cx + 0.42*scale*np.cos(r); y1 = cy + 0.42*scale*np.sin(r)
        ax.plot([x0,x1],[y0,y1], color=color, lw=3.5*scale, zorder=5,
                solid_capstyle='round')

# ─────────────────────────────────────────────────────────────────────────────
# TITRE
# ─────────────────────────────────────────────────────────────────────────────
rbox(1.5, 9.8, 15, 0.95, C_WHITE, C_BLUE, lw=2.5, radius=0.3, zorder=2)
txt(9, 10.38, "Proposition d'architecture de la plateforme", size=17, color=C_BLUE, bold=True)
txt(9, 9.98, "Atlas Finance — Gestion Budgétaire Collaborative", size=11, color=C_GOLD, bold=True)

# ─────────────────────────────────────────────────────────────────────────────
# BOX GAUCHE — Navigateur Web
# ─────────────────────────────────────────────────────────────────────────────
rbox(0.3, 1.5, 4.0, 8.0, C_LIGHT, C_ORANGE, lw=2.5, radius=0.5, zorder=2)
txt(2.3, 9.05, "Navigateur Web", size=13, color=C_ORANGE, bold=True)
txt(2.3, 8.65, "Client (React 19 + Vite)", size=9, color=C_GREY)

icon_monitor(2.3, 7.55, scale=1.2, color=C_BLUE)

for i, (role, color) in enumerate([
    ("Administrateur", C_PURPLE),
    ("Comptable",      C_GREEN),
    ("Gestionnaire",   C_GOLD),
]):
    rbox(0.6, 5.7 - i*0.9, 3.4, 0.72, C_WHITE, color, lw=1.8, radius=0.2, zorder=4)
    txt(2.3, 6.06 - i*0.9, role, size=11, color=color, bold=True)

txt(2.3, 1.85, "SPA — Single Page Application", size=8.5, color=C_GREY)

# ─────────────────────────────────────────────────────────────────────────────
# CLOUD INTERNET
# ─────────────────────────────────────────────────────────────────────────────
cloud(5.6, 5.5, r=0.55, color='#7EA8C4', alpha=0.4)
txt(5.9, 5.05, "Internet", size=8.5, color=C_GREY)

# ─────────────────────────────────────────────────────────────────────────────
# SERVEUR CENTRAL — Railway
# ─────────────────────────────────────────────────────────────────────────────
rbox(7.3, 1.5, 3.8, 8.0, C_WHITE, C_BLUE, lw=3, radius=0.5, zorder=2)
txt(9.2, 9.08, "SERVEUR", size=14, color=C_BLUE, bold=True)
txt(9.2, 8.6,  "Railway Cloud", size=10, color=C_GOLD, bold=True)

icon_globe(9.2, 7.3, scale=0.95)

comps = [
    ("Django REST Framework 3.17", C_GREEN),
    ("SimpleJWT — Auth Bearer",    C_GOLD),
    ("PostgreSQL (plugin Railway)", C_BLUE),
    ("WhiteNoise — Statiques",      C_GREY),
    ("Gunicorn — WSGI Server",      '#374151'),
]
for i, (comp, col) in enumerate(comps):
    rbox(7.55, 5.5 - i*0.73, 3.3, 0.58, '#EEF2F7', col, lw=1.2, radius=0.15, zorder=4)
    txt(9.2, 5.79 - i*0.73, comp, size=9, color=col)

txt(9.2, 1.85, "Port $PORT | HTTPS (TLS Railway)", size=8.5, color=C_GREY)

# ─────────────────────────────────────────────────────────────────────────────
# BOX HAUT DROITE — Claude AI
# ─────────────────────────────────────────────────────────────────────────────
rbox(12.2, 6.5, 5.4, 3.0, '#F5F0FF', C_PURPLE, lw=2.5, radius=0.5, zorder=2)
txt(14.9, 9.1, "Intelligence Artificielle", size=12, color=C_PURPLE, bold=True)
icon_ia(13.3, 7.85, scale=1.05, color=C_PURPLE)
txt(15.3, 8.35, "Claude Sonnet 4.6", size=11, color=C_BLUE, bold=True)
txt(15.3, 7.85, "Anthropic API", size=10, color=C_PURPLE)
txt(15.3, 7.35, "Chatbot & Analyse budgétaire", size=9, color=C_GREY)
txt(14.9, 6.75, "HTTPS — Appel externe (optionnel)", size=8.5, color=C_GREY)

# ─────────────────────────────────────────────────────────────────────────────
# BOX BAS DROITE — Interface Admin
# ─────────────────────────────────────────────────────────────────────────────
rbox(12.2, 1.5, 5.4, 4.3, '#FFF8EF', C_ORANGE, lw=2.5, radius=0.5, zorder=2)
txt(14.9, 5.45, "Interface Administration", size=12, color=C_ORANGE, bold=True)
icon_admin(13.3, 3.85, scale=1.05, color=C_ORANGE)
txt(15.3, 4.85, "Django Jazzmin Admin", size=11, color=C_BLUE, bold=True)
txt(15.3, 4.35, "/admin/  —  Back-office", size=10.5, color=C_ORANGE, bold=True)
txt(15.3, 3.85, "Gestion complète des données", size=9, color=C_GREY)
txt(15.3, 3.4,  "Utilisateurs · Budgets · Audit", size=9, color=C_GREY)
txt(14.9, 1.85, "Reservé Administrateur", size=8.5, color=C_GREY)

# ─────────────────────────────────────────────────────────────────────────────
# FLÈCHES
# ─────────────────────────────────────────────────────────────────────────────
# Navigateur ↔ cloud
arrow(4.3, 5.5, 4.85, 5.5, color='#3B82F6', lw=2.5, bi=True)
# Cloud ↔ Serveur  (avec label)
arrow(6.45, 5.5, 7.3, 5.5, color='#3B82F6', lw=2.5, label='HTTPS / API REST + JWT', lcolor=C_REST, bi=True)

# Serveur → Claude (nuage intermédiaire)
cloud(11.1, 8.0, r=0.42, color='#C4A0E0', alpha=0.4)
ax.annotate('', xy=(11.1, 7.45), xytext=(11.0, 6.0),
    arrowprops=dict(arrowstyle='->', color=C_PURPLE, lw=1.8), zorder=4)
ax.annotate('', xy=(12.2, 7.85), xytext=(11.55, 7.85),
    arrowprops=dict(arrowstyle='->', color=C_PURPLE, lw=1.8), zorder=4)
txt(11.75, 8.25, "API HTTPS", size=8.5, color=C_PURPLE, bold=True)

# Serveur → Admin
cloud(11.1, 3.5, r=0.42, color='#FCD38A', alpha=0.4)
ax.annotate('', xy=(11.1, 3.95), xytext=(11.0, 5.0),
    arrowprops=dict(arrowstyle='->', color=C_ORANGE, lw=1.8), zorder=4)
ax.annotate('', xy=(12.2, 3.85), xytext=(11.55, 3.85),
    arrowprops=dict(arrowstyle='->', color=C_ORANGE, lw=1.8), zorder=4)
txt(11.75, 4.35, "HTTP", size=8.5, color=C_ORANGE, bold=True)

# ─────────────────────────────────────────────────────────────────────────────
# LÉGENDE
# ─────────────────────────────────────────────────────────────────────────────
ax.axhline(y=1.35, xmin=0.015, xmax=0.985, color='#C8B89A', lw=1, alpha=0.7)
legend = [
    (C_ORANGE, "Couche Présentation — Frontend React"),
    (C_BLUE,   "Couche Métier — Backend Django + BDD"),
    (C_PURPLE, "Service IA externe — Anthropic Claude"),
    (C_ORANGE, "Administration — Jazzmin Back-office"),
]
for i, (col, label) in enumerate(legend):
    x = 0.5 + i * 4.4
    ax.add_patch(FancyBboxPatch((x-0.02, 0.55), 0.35, 0.45,
        boxstyle="round,pad=0,rounding_size=0.08",
        fc=col, ec='none', zorder=4, alpha=0.9))
    ax.text(x + 0.45, 0.77, label, va='center', fontsize=8.5, color=C_GREY)

# ─────────────────────────────────────────────────────────────────────────────
# SAVE
# ─────────────────────────────────────────────────────────────────────────────
plt.tight_layout(pad=0.1)
out = 'architecture_atlas_finance.png'
plt.savefig(out, dpi=200, bbox_inches='tight', facecolor=C_BG)
print(f"[OK] Image sauvegardee : {out}")
plt.close()
