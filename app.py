import json

from flask import Flask, render_template

# Create an instance of the Flask class
app = Flask(__name__)

# Define a route and a corresponding function to handle requests
@app.route('/')
def index():
    return '<b> Hello, World! </b> <br> <a href= \"{{url_for( \'hello\' )}}\" > Press for hello </a>'

@app.route("/bathrooms")
def bathrooms():
    return render_template("main.html")

@app.route('/hello')
def hello():
    return "hello"

# Run the Flask application
if __name__ == '__main__':
    app.run(debug=True)