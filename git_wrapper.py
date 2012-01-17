#!/usr/bin/env python

import subprocess

def status():
    lines = subprocess.check_output(['git', 'status'])

    modified_files = []
    for line in lines.split('\n'):
        if line.find('modified:') != -1:
            modified_files.append(line.split('modified:')[1].strip())
    return {
        'modified': modified_files
    }

def diff(filename):
    return subprocess.check_output(['git', 'diff', filename])

def main():
    #print status()
    print diff('git_wrapper.py')

if __name__ == '__main__':
    main()
