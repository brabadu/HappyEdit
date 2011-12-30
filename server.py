#!/usr/bin/env python

import os
import mimetypes
import json
from urlparse import parse_qsl
from wsgiref.simple_server import make_server

class File:

    def __init__(self, path):
        self.path = path

    def __call__(self, environ, start_response):
        start_response("200 OK", [
            ('Content-Type', mimetypes.guess_type(self.path)[0]),
            ('Content-Length', str(os.path.getsize(self.path))),
        ])
        return [open(self.path, 'rb').read()]

class Directory(dict):

    def __init__(self, path):
        self.path = path
        self.load()

    def load(self):
        self.clear()
        for child in os.listdir(self.path):
            childpath = os.path.join(self.path, child)
            if os.path.isdir(childpath):
                self[child] = Directory(childpath)
            else:
                self[child] = File(childpath)

    def __getitem__(self, key):
        self.load()
        return dict.__getitem__(self, key)

    def __call__(self, environ, start_response):
        parts = [i for i in environ['PATH_INFO'].split('/') if i != '']
        obj = self
        for part in parts:
            if part not in obj:
                msg =  part + ' not found in ' + repr(self)
                start_response("404 Not Found", [
                    ('Content-Type', 'text/plain'),
                    ('Content-Length', str(len(msg))),
                ])
                return [msg]
            obj = obj[part]
        return obj(environ, start_response)

    def __repr__(self):
        return self.path

class FileListing():

    def __init__(self, path, next_app):
        self.path = path
        self.next_app = next_app

    def __call__(self, environ, start_response):
        if environ['PATH_INFO'] == '/files':
            response = json.dumps(os.listdir(os.getcwd()))
            start_response("200 OK", [
                ('Content-Type', 'application/json'),
                ('Content-Length', str(len(response))),
            ])
            return [response]
        return self.next_app(environ, start_response)

class SaveHandler():

    def __init__(self, next_app):
        self.next_app = next_app

    def __call__(self, environ, start_response):
        if environ['PATH_INFO'] == '/save':
            length = int(environ['CONTENT_LENGTH'])
            params = dict(parse_qsl(environ['wsgi.input'].read(length)))
            open(params['file'], 'w').write(params['lines'])
            msg = 'File saved'
            start_response("200 OK", [
                ('Content-Type', 'application/json'),
                ('Content-Length', str(len(msg))),
            ])
            return [msg]
        return self.next_app(environ, start_response)

def main():
    cwd = os.getcwd()
    app = FileListing(cwd, SaveHandler(Directory(cwd)))
    try:
        print "Serving " + os.getcwd() + " to http://localhost:8888"
        make_server('0.0.0.0', 8888, app).serve_forever()
    except KeyboardInterrupt, ki:
        print ""
        print "Bye bye"

if __name__ == '__main__':
    main()

