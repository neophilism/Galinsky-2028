#!/usr/bin/env node
import {readFileSync} from 'node:fs';
import {validateSignedMaterialRelease} from '../packages/core/staff-review.mjs';
try{
 const records=JSON.parse(readFileSync('content/materials/current.json','utf8'));
 const registry=JSON.parse(readFileSync('content/materials/staff-keys.json','utf8'));
 validateSignedMaterialRelease(records,registry);
 console.log('VERIFIED '+records.length+' independently signed, current volunteer-material revisions');
}catch(e){console.error('Publication denied: '+e.message);process.exitCode=1;}
