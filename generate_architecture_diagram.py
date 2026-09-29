import matplotlib.pyplot as plt
import matplotlib.patches as patches
import os

os.makedirs(r"c:\Users\ayush\OneDrive\Desktop\Sih2026\forecast-bust-prototype\assets", exist_ok=True)
fig, ax = plt.subplots(figsize=(10, 13), dpi=300)

# Background color
fig.patch.set_facecolor('#0B132B')
ax.set_facecolor('#0B132B')

# Nodes definition: (title, subtitle, color, border_color)
steps = [
    ("1. Historical GEFS Forecast", "NOAA GEFSv12 Reforecast Archive (0.25° grid, Day 1-10 APCP)", "#1C2541", "#48CAE4"),
    ("2. IMERG Reference Verification", "NASA GPM IMERG Final Daily V07/V07B (Interpolated to 0.25°)", "#1C2541", "#00B4D8"),
    ("3. Spatiotemporal Forecast Error", "Absolute Error = |Forecast_rain - Reference_rain| (mm)", "#1C2541", "#0096C7"),
    ("4. Empirical Bust Definition", "Target = 1 if Absolute Error >= 28.68 mm (90th Percentile Threshold)", "#2C1B4D", "#B5179E"),
    ("5. Machine Learning Classifier", "RandomForestClassifier trained on forecast features (AUC: 0.7148)", "#3A0CA3", "#7209B7"),
    ("6. Bust Probability Estimation", "P(Bust = 1 | Forecast Features) across Day 1–10 horizons", "#1C2541", "#4361EE"),
    ("7. Prototype Confidence Scoring", "Prototype Confidence % = 100 * (1 - Bust Probability)", "#1C2541", "#4895EF"),
    ("8. Risk Mapping & Feature Attribution", "Visual Buckets (Low/Mod/High) + Global/Local Feature Signals", "#1C2541", "#4CC9F0"),
    ("9. Interactive Decision Support Dashboard", "Streamlit UI: Historical Replay, GIS Maps, Day 1-10 Trajectories", "#0D3B66", "#00F5D4")
]

n = len(steps)
box_width = 8.2
box_height = 0.8
start_y = 11.5
y_gap = 1.3

for i, (title, subtitle, bg_col, border_col) in enumerate(steps):
    y = start_y - (i * y_gap)
    # Box rectangle
    rect = patches.FancyBboxPatch(
        (1.0 - box_width/2, y - box_height/2), box_width, box_height,
        boxstyle="round,pad=0.18,rounding_size=0.15",
        facecolor=bg_col,
        edgecolor=border_col,
        linewidth=2.2,
        zorder=3
    )
    ax.add_patch(rect)
    
    # Text
    ax.text(1.0, y + 0.12, title, ha='center', va='center', color='#FFFFFF', fontsize=12.5, fontweight='bold', zorder=4)
    ax.text(1.0, y - 0.20, subtitle, ha='center', va='center', color='#B0C4DE', fontsize=9.5, style='italic', zorder=4)
    
    # Downward arrow
    if i < n - 1:
        arrow_y_start = y - box_height/2 - 0.05
        arrow_y_end = y - y_gap + box_height/2 + 0.08
        ax.annotate(
            '',
            xy=(1.0, arrow_y_end),
            xytext=(1.0, arrow_y_start),
            arrowprops=dict(facecolor=border_col, edgecolor=border_col, width=2.5, headwidth=8.5, headlength=8.5, shrink=0.05),
            zorder=2
        )

# Header Title
ax.text(1.0, 12.5, "AI-Based Forecast Bust Detection Architecture", ha='center', va='center', color='#00F5D4', fontsize=16, fontweight='bold')
ax.text(1.0, 12.15, "Problem Statement 26079 | Medium-Range Rainfall Forecast Verification Pipeline", ha='center', va='center', color='#E0E1DD', fontsize=10.5)

ax.set_xlim(-3.8, 5.8)
ax.set_ylim(-0.5, 13.0)
ax.axis('off')

plt.tight_layout()
plt.savefig(r"c:\Users\ayush\OneDrive\Desktop\Sih2026\forecast-bust-prototype\assets\architecture.png", facecolor=fig.get_facecolor(), edgecolor='none', bbox_inches='tight')
print("Successfully generated assets/architecture.png")
