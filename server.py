#!/usr/bin/env python

import sys
import os
import mimetypes
import json
import subprocess
from urlparse import parse_qsl
from urllib import unquote
from wsgiref.simple_server import make_server

class File:

    def __init__(self, path):
        self.path = path

    def __call__(self, environ, start_response):
        start_response("200 OK", [
            ('Access-Control-Allow-Origin', '*'),
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

    def notfound(self, part, environ, start_response):
        msg =  part + ' not found in ' + repr(self)
        start_response("404 Not Found", [
            ('Access-Control-Allow-Origin', '*'),
            ('Content-Type', 'text/plain'),
            ('Content-Length', str(len(msg))),
        ])
        return [msg]

    def __call__(self, environ, start_response):
        parts = [i for i in environ['PATH_INFO'].split('/') if i != '']
        obj = self
        for part in parts:
            if part not in obj:
                return self.notfound(part, environ, start_response)
            obj = obj[part]
        return obj(environ, start_response)

    def __repr__(self):
        return self.path

def get_project_files(project_path, ignored_extensions):
    project_files = []
    for dirpath, dirnames, filenames in os.walk(project_path, topdown=True):
        for dirname in dirnames:
            if dirname.startswith('.'):
                dirnames.remove(dirname)
        for filename in filenames:
            ext = os.path.splitext(filename)[1]
            if not ext in ignored_extensions:
                project_files.append(os.path.relpath(os.path.join(dirpath, filename)))
    return project_files

class FileListing():

    def __init__(self, path):
        self.path = path
        self.next_handler = None

    def __call__(self, environ, start_response):
        if environ['PATH_INFO'] in ['/files', '/files/']:
            params = dict(parse_qsl(environ['QUERY_STRING']))
            ignored_extensions = params.get('ignored_extensions', '').split(',')
            response = json.dumps(get_project_files(self.path, ignored_extensions))
            start_response("200 OK", [
                ('Access-Control-Allow-Origin', '*'),
                ('Content-Type', 'application/json'),
                ('Content-Length', str(len(response))),
            ])
            return [response]
        return self.next_handler(environ, start_response)

class SaveHandler():

    def __init__(self, path):
        self.path = path
        self.next_handler = None

    def __call__(self, environ, start_response):
        if environ['REQUEST_METHOD'] == 'POST' and environ['PATH_INFO'].startswith('/files'):
            filename = os.path.join(environ['PATH_INFO'][7:])
            length = int(environ['CONTENT_LENGTH'])
            params = dict(parse_qsl(environ['wsgi.input'].read(length)))
            open(filename, 'w').write(params['body'])
            msg = 'File saved'
            start_response("200 OK", [
                ('Access-Control-Allow-Origin', '*'),
                ('Content-Type', 'application/json'),
                ('Content-Length', str(len(msg))),
            ])
            return [msg]
        return self.next_handler(environ, start_response)

class GrepHandler():

    def __init__(self, path):
        self.path = path
        self.next_handler = None

    def __call__(self, environ, start_response):
        if environ['PATH_INFO'] == '/grep':
            params = dict(parse_qsl(environ['QUERY_STRING']))
            # Get the GET parameter q
            try:
                q = unquote(params['q'])
            # Else tell the user we need it and return
            except KeyError:
                ret = 'The GET parameter q is required for /grep'
                start_response("501 Not Implemented", [
                    ('Content-Type', 'text/plain'),
                    ('Content-Length', str(len(ret))),
                ])
                return [ret] 

            try:
                files = subprocess.check_output(['grep', '-inr', q, '.'])
            except subprocess.CalledProcessError, cpe:
                # Make sure it looks like nothign was returned
                if cpe.output != "" or cpe.returncode != 1:
                    # if it doesn't look expected, raise
                    raise cpe
                # Else it looks like nothing was returned
                files = ""

            ret = []
            for line in files.split('\n'):
                parts = line.split(':')
                if len(parts) > 1:
                    ret.append({
                        'filename': parts[0].split('./')[1],
                        'lineno': parts[1],
                    })
            ret = json.dumps(ret)

            start_response("200 OK", [
                ('Content-Type', 'application/json'),
                ('Content-Length', str(len(ret))),
            ])
            return [ret]
        return self.next_handler(environ, start_response)

class ProjectFilesServer(Directory):

    def __call__(self, environ, start_response):
        if environ['REQUEST_METHOD'] == 'GET' and environ['PATH_INFO'].startswith('/files/'):
            environ['PATH_INFO'] = environ['PATH_INFO'][7:]
            return Directory.__call__(self, environ, start_response)
        return self.next_handler(environ, start_response)

class ProjectInfoHandler():

    def __init__(self, path):
        self.path = path
        self.next_handler = None

    def __call__(self, environ, start_response):
        if environ['PATH_INFO'].startswith('/info'):
            ret = {
                'path': self.path,
            }
            ret = json.dumps(ret)

            start_response("200 OK", [
                ('Access-Control-Allow-Origin', '*'),
                ('Content-Type', 'application/json'),
                ('Content-Length', str(len(ret))),
            ])
            return [ret]
        return self.next_handler(environ, start_response)

class NotFoundHandler:

    def __call__(self, environ, start_response):
        msg = "404 Not Found"
        start_response("200 OK", [
            ('Access-Control-Allow-Origin', '*'),
            ('Content-Type', 'text/plain'),
            ('Content-Length', str(len(msg))),
        ])
        return [msg]

def main():
    path = os.path.dirname(os.path.abspath(sys.argv[0]))
    cwd = os.getcwd()

    handlers = []
    handlers.append(GrepHandler(cwd))
    handlers.append(ProjectInfoHandler(cwd))
    handlers.append(FileListing(cwd))
    handlers.append(SaveHandler(cwd))
    handlers.append(ProjectFilesServer(cwd))
    handlers.append(NotFoundHandler())

    i = 0
    for handler in handlers:
        i += 1
        if i < len(handlers):
            handler.next_handler = handlers[i]

    try:
        print "Serving " + cwd + " to http://localhost:8888"
        make_server('localhost', 8888, handlers[0]).serve_forever()
    except KeyboardInterrupt, ki:
        print "\nBye bye"

if __name__ == '__main__':
    main()

