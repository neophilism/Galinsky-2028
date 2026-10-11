import {createHash} from 'node:crypto';
import {canReadMaterial} from './content.mjs';
import {assert} from './validation.mjs';

export function readableVersion(material,account){
 assert(canReadMaterial(material,account),'not_found','The current approved version is not available.',404);
 assert(typeof material.body==='string'&&material.body.length<=100000,'invalid_content','The material body is not valid.');
 const hash=createHash('sha256').update(material.body,'utf8').digest('hex');
 return {materialId:material.id,revision:material.revision,contentSha256:hash};
}
export function matchesReading(material,account,ack){
 if(!ack||!canReadMaterial(material,account))return false;
 const v=readableVersion(material,account);
 return ack.materialId===v.materialId&&ack.revision===v.revision&&ack.contentSha256===v.contentSha256;
}
