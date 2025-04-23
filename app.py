from flask import Flask, render_template, request, redirect, url_for, send_from_directory, jsonify
import requests
from datetime import datetime, timedelta
import os
from werkzeug.utils import secure_filename
import google.generativeai as genai 
import logging

app = Flask(__name__)
API_KEY = ''  
GENAI_KEY = ""  
UPLOAD_FOLDER = 'uploads'
ALLOWED_EXTENSIONS = {'png', 'jpg', 'jpeg', 'gif'}

app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER
genai.configure(api_key=GENAI_KEY)

my_plants_data = []  
logging.basicConfig(level=logging.INFO) 

def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

def get_gemini_response(query):
    """Sends the user's query to the Gemini API and returns the response."""
    plant_care_prompt = f"You are a helpful plant care assistant. Answer the following question about plants: {query}"
    try:
        model = genai.GenerativeModel(model_name="gemini-2.0-flash")
        response = model.generate_content(plant_care_prompt)
        return response.text
    except Exception as e:
        logging.error(f"Error calling Gemini API: {e}")
        return f"Error: {e}"

def fetch_plant_details(plant_id):
    """Fetches details for a specific plant from the Perenual API."""
    details_url = f"https://perenual.com/api/species/details/{plant_id}?key={API_KEY}"
    try:
        details_res = requests.get(details_url)
        details_res.raise_for_status()
        return details_res.json()
    except requests.exceptions.RequestException as e:
        logging.error(f"Error fetching plant details: {e}")
        return None
    except ValueError:
        logging.error("Error parsing JSON from details API")
        return None

def search_plants(plant_name):
    """Searches for plants by name using the Perenual API."""
    search_url = f"https://perenual.com/api/species-list?key={API_KEY}&q={plant_name}"
    try:
        res = requests.get(search_url)
        res.raise_for_status()
        res_json = res.json()

        if 'data' in res_json and res_json['data']:
            plant_basic = res_json['data'][0]
            plant_id = plant_basic['id']
            return plant_id
        else:
            return None
    except requests.exceptions.RequestException as e:
        logging.error(f"Error during plant search: {e}")
        return None
    except ValueError:
        logging.error("Error parsing JSON during plant search")
        return None

@app.route('/')
def home():
    featured_plants = [
        {'id': 715, 'image_url': 'https://images.unsplash.com/photo-1587330974746-09196344426a?auto=format&fit=crop&w=500&q=60', 'alt': 'Monstera Deliciosa'},
        {'id': 680, 'image_url': 'https://images.unsplash.com/photo-1592610850349-399444114a42?auto=format&fit=crop&w=500&q=60', 'alt': 'Snake Plant'},
        {'id': 702, 'image_url': 'https://images.unsplash.com/photo-1604762547526-c44314902194?auto=format&fit=crop&w=500&q=60', 'alt': 'ZZ Plant'},
        {'id': 731, 'image_url': 'https://images.unsplash.com/photo-1584475437935-343a19c34251?auto=format&fit=crop&w=500&q=60', 'alt': 'Peace Lily'},
        {'id': 693, 'image_url': 'https://images.unsplash.com/photo-1513301614720-48765c59b578?auto=format&fit=crop&w=500&q=60', 'alt': 'Pothos'},
        {'id': 742, 'image_url': 'https://images.unsplash.com/photo-1586339949916-e5935c971154?auto=format&fit=crop&w=500&q=60', 'alt': 'Calathea'},
        {'id': 720, 'image_url': 'https://images.unsplash.com/photo-1580723792878-c53498cec499?auto=format&fit=crop&w=500&q=60', 'alt': 'Fiddle Leaf Fig'},
        {'id': 751, 'image_url': 'https://images.unsplash.com/photo-1616373644948-2194a552822d?auto=format&fit=crop&w=500&q=60', 'alt': 'Succulent'},
    ]
    return render_template('index.html', featured_plants=featured_plants)

@app.route('/chatbot')
def chatbot():
    return render_template('index1.html')

@app.route('/gemini_query', methods=['POST'])
def gemini_query():
    data = request.get_json()
    query = data.get('query')

    if not query:
        return jsonify({'error': 'No query provided'}), 400

    gemini_response = get_gemini_response(query)
    return jsonify({'response': gemini_response})

@app.route('/search', methods=['POST'])
def search():
    plant_name = request.form['plant_name']
    plant_id = search_plants(plant_name)

    if plant_id:
        plant_details = fetch_plant_details(plant_id)
        if plant_details:
            return render_template('result.html', plant=plant_details)
        else:
            return render_template('result.html', plant=None, message="Could not retrieve details for this plant.")
    else:
        return render_template('result.html', plant=None, message="No plant found with that name.")

@app.route('/my_plants')
def my_plants():
    for plant in my_plants_data:
        calculate_next_watering(plant)
    return render_template('my_plants.html', my_plants=my_plants_data)

def calculate_next_watering(plant):
    """Calculates and adds the 'next_watering' date to a plant dictionary."""
    if 'watering_frequency' in plant and plant['watering_frequency'] and plant.get('last_watered'):
        try:
            last_watered_date = datetime.strptime(plant['last_watered'], '%Y-%m-%d')
            next_watering_date = last_watered_date + timedelta(days=int(plant['watering_frequency']))
            plant['next_watering'] = next_watering_date.strftime('%Y-%m-%d')
        except ValueError:
            plant['next_watering'] = None
    else:
        plant['next_watering'] = None

@app.route('/add_plant', methods=['POST'])
def add_plant():
    name = request.form['name']
    nickname = request.form.get('nickname')
    watering_frequency = request.form.get('watering_frequency')
    image = request.files.get('image')
    added_date = datetime.now().strftime('%Y-%m-%d')
    image_url = None

    if image and allowed_file(image.filename):
        filename = secure_filename(image.filename)
        filepath = os.path.join(app.config['UPLOAD_FOLDER'], filename)
        os.makedirs(app.config['UPLOAD_FOLDER'], exist_ok=True)
        image.save(filepath)
        image_url = os.path.join('/' + app.config['UPLOAD_FOLDER'], filename)

    new_plant = {
        'name': name,
        'nickname': nickname,
        'watering_frequency': watering_frequency,
        'added_date': added_date,
        'image_url': image_url,
        'last_watered': None,
        'next_watering': None
    }
    my_plants_data.append(new_plant)
    return redirect(url_for('my_plants'))

@app.route('/mark_watered/<int:plant_index>', methods=['POST'])
def mark_watered(plant_index):
    if 0 <= plant_index < len(my_plants_data):
        my_plants_data[plant_index]['last_watered'] = datetime.now().strftime('%Y-%m-%d')
        calculate_next_watering(my_plants_data[plant_index])
        return redirect(url_for('my_plants'))
    else:
        return "Invalid plant index", 400

@app.route('/plant/<int:plant_id>')
def plant_details(plant_id):
    plant_details = fetch_plant_details(plant_id)
    if plant_details:
        return render_template('plant_details.html', plant=plant_details)
    else:
        return render_template('plant_details.html', plant=None, message="Could not retrieve details for this plant.")

@app.route('/uploads/<filename>')
def uploaded_file(filename):
    return send_from_directory(app.config['UPLOAD_FOLDER'], filename)

if __name__ == '__main__':
    app.run(debug=True)
