
Development
===========

Quagen is built using Python on top of the [Flask][flask] microframework.  
The quickest way to get started is with `virtualenv` and a few pip installs.

    cd quagen
    virtualenv venv
    venv\Scripts\activate
    pip install -r requirements.txt
     
    set FLASK_APP=quagen
    set FLASK_ENV=development    
    flask init-db
    flask run

Open up http://127.0.0.1:5000 to play/debug!

[flask]: http://flask.pocoo.org/