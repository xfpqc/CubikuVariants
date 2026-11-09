from PIL import Image

# Open your original icon (ensure it has a transparent background)
icon = Image.open("icon-512.png").convert("RGBA")

# Resize the icon slightly so it doesn't hit the edges of the preview card
icon_resized = icon.resize((400, 400), Image.Resampling.LANCZOS)

# Create the 1200x630 canvas with a true black background for WhatsApp
og_image = Image.new("RGBA", (1200, 630), (0, 0, 0, 255))

# Calculate the center position
x = (1200 - 400) // 2
y = (630 - 400) // 2

# Paste the icon into the center using its own alpha channel as the mask
og_image.paste(icon_resized, (x, y), icon_resized)

# Save the final image
og_image.convert("RGB").save("og-image.png")
