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

project_files = []

def get_project_files(project_path, ignored_extensions):
    global project_files
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

    def __init__(self, path, next_app):
        self.path = path
        self.next_app = next_app

    def __call__(self, environ, start_response):
        if environ['PATH_INFO'] == '/files':
            params = dict(parse_qsl(environ['QUERY_STRING']))
            ignored_extensions = params.get('ignored_extensions', '').split(',')
            response = json.dumps(get_project_files(self.path, ignored_extensions))
            start_response("200 OK", [
                ('Content-Type', 'application/json'),
                ('Content-Length', str(len(response))),
            ])
            return [response]
        return self.next_app(environ, start_response)

class SaveHandler():

    def __init__(self, path, next_app):
        self.path = path
        self.next_app = next_app

    def __call__(self, environ, start_response):
        if environ['PATH_INFO'] == '/save':
            length = int(environ['CONTENT_LENGTH'])
            params = dict(parse_qsl(environ['wsgi.input'].read(length)))
            open(os.path.join(params['file']), 'w').write(params['lines'])
            msg = 'File saved'
            start_response("200 OK", [
                ('Content-Type', 'application/json'),
                ('Content-Length', str(len(msg))),
            ])
            return [msg]
        return self.next_app(environ, start_response)

class CodeBoxFilesServer(Directory):

    def __init__(self, path, next_app):
        self.next_app = next_app
        Directory.__init__(self, path)

    def __call__(self, environ, start_response):
        if environ['PATH_INFO'] == '/':
            environ['PATH_INFO'] = '/index.html'
        return Directory.__call__(self, environ, start_response)

    def notfound(self, part, environ, start_response):
        return self.next_app(environ, start_response)

class GrepHandler():

    def __init__(self, path, next_app):
        self.path = path
        self.next_app = next_app

    def __call__(self, environ, start_response):
        global project_files
        if environ['PATH_INFO'] == '/grep':
            #files = [os.path.abspath(i) for i in project_files]
            #files = ' '.join(files)

            params = dict(parse_qsl(environ['QUERY_STRING']))
            q = unquote(params['q'])

            files = subprocess.check_output(['grep', '-inr', q, '.'])

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
        return self.next_app(environ, start_response)

class ProjectFilesServer(Directory):

    def __call__(self, environ, start_response):
        if not environ['PATH_INFO'].startswith('/project/'):
            raise Exception("ProjectFilesServer reached but PATH_INFO does not start with '/project/'")
        environ['PATH_INFO'] = environ['PATH_INFO'][8:]
        return Directory.__call__(self, environ, start_response)

class BranchChangeHandler():

    def __init__(self, path, next_app):
        self.path = path
        self.next_app = next_app

    def __call__(self, environ, start_response):
        if environ['PATH_INFO'].startswith('/branch'):
            length = int(environ['CONTENT_LENGTH'])
            params = dict(parse_qsl(environ['wsgi.input'].read(length)))
            ret = "changing branch to %s" % params['branch']
            subprocess.check_output(['git', 'checkout', params['branch']])
            start_response("200 OK", [
                ('Content-Type', 'application/json'),
                ('Content-Length', str(len(ret))),
            ])
            return [ret]
        return self.next_app(environ, start_response)

class ProjectInfoHandler():

    def __init__(self, path, next_app):
        self.path = path
        self.next_app = next_app

    def get_branches(self):
        s = subprocess.check_output(['git', 'branch'])
        ret = []
        for line in s.split('\n'):
            if line:
                ret.append({
                    'title': line.split('* ')[-1].strip(),
                    'selected': line.startswith('*'),
                })
        return ret

    def __call__(self, environ, start_response):
        if environ['PATH_INFO'].startswith('/info'):
            ret = {
                'path': self.path,
                'branches': self.get_branches(),
            }
            ret = json.dumps(ret)

            start_response("200 OK", [
                ('Content-Type', 'application/json'),
                ('Content-Length', str(len(ret))),
            ])
            return [ret]
        return self.next_app(environ, start_response)

def main():
    codebox_path = os.path.dirname(os.path.abspath(sys.argv[0]))
    cwd = os.getcwd()
    app = CodeBoxFilesServer(codebox_path, GrepHandler(cwd, BranchChangeHandler(cwd, ProjectInfoHandler(cwd, FileListing(cwd, SaveHandler(cwd, ProjectFilesServer(cwd)))))))
    try:
        print "Serving " + os.getcwd() + " to http://localhost:8888"
        make_server('0.0.0.0', 8888, app).serve_forever()
    except KeyboardInterrupt, ki:
        print ""
        print "Bye bye"

if __name__ == '__main__':
    main()

