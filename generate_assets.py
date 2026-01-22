from PIL import Image, ImageDraw, ImageFont
import os

def create_icon(size, text="M+", filename=None):
    # Colors
    bg_color = (66, 133, 244) # Google Blueish
    text_color = (255, 255, 255)
    
    img = Image.new('RGB', (size, size), color=bg_color)
    d = ImageDraw.Draw(img)
    
    # Simple calculation for text placement (approximate centered)
    # Ideally we use a font file, but default font might be too small
    # We will draw a simple rectangle for "Mute" symbol concept if font issues arise
    # Let's try to draw a speaker with a slash using basic shapes
    
    margin = size // 4
    
    # Speaker body
    # nothing fancy, just a letter 'M' roughly drawn or text if possible.
    # Since loading fonts can be system dependent, let's draw a simple geometric 'M'
    
    w, h = size, size
    thickness = max(1, size // 10)
    
    # Draw M
    points = [
        (w*0.2, h*0.8), # Bottom left
        (w*0.2, h*0.2), # Top left
        (w*0.5, h*0.5), # Middle bottomish
        (w*0.8, h*0.2), # Top right
        (w*0.8, h*0.8)  # Bottom right
    ]
    d.line(points, fill=text_color, width=thickness)
    
    # Save
    if filename:
        img.save(filename)
    return img

def create_promo(width, height, text, filename):
    bg_color = (66, 133, 244)
    text_color = (255, 255, 255)
    img = Image.new('RGB', (width, height), color=bg_color)
    d = ImageDraw.Draw(img)
    
    # We can't easily center text without a font object, so we'll just make a simple geometric pattern
    # Draw a big M in the background faint
    
    # Draw a white border
    d.rectangle([10, 10, width-10, height-10], outline=text_color, width=5)
    
    img.save(filename)

def create_screenshot(width, height, filename):
    # Create a dummy screenshot showing the popup
    bg_color = (240, 240, 240)
    img = Image.new('RGB', (width, height), color=bg_color)
    d = ImageDraw.Draw(img)
    
    # Fake Browser Window
    d.rectangle([50, 50, width-50, height-50], fill=(255, 255, 255), outline=(200, 200, 200))
    # Header
    d.rectangle([50, 50, width-50, 150], fill=(230, 230, 230))
    
    # Popup representation
    popup_w, popup_h = 300, 400
    popup_x = width - 50 - popup_w - 20
    popup_y = 100
    
    d.rectangle([popup_x, popup_y, popup_x+popup_w, popup_y+popup_h], fill=(255, 255, 255), outline=(0,0,0))
    # Popup Header
    d.rectangle([popup_x, popup_y, popup_x+popup_w, popup_y+50], fill=(66, 133, 244))
    
    img.save(filename)

# Generate Icons
sizes = [16, 32, 48, 128]
if not os.path.exists('icons'):
    os.makedirs('icons')

for s in sizes:
    create_icon(s, filename=f'icons/icon{s}.png')

# Generate Store Assets
if not os.path.exists('store_assets'):
    os.makedirs('store_assets')

create_promo(440, 280, "M+ Muter", 'store_assets/promo_tile.png')
create_screenshot(1280, 800, 'store_assets/screenshot.png')

print("Assets generated.")
