class DublyCaptureProcessor extends AudioWorkletProcessor {
  process(inputs, outputs) {
    const input = inputs[0] || [];
    const output = outputs[0] || [];
    // This node is only used to tap the capture stream. The original stream is routed separately.
    for (const ch of output) ch.fill(0);
    if (!input.length) return true;

    const frames=input[0]?.length || 0;
    const mono=new Float32Array(frames);
    for(let i=0;i<frames;i++){
      let sum=0;
      for(let c=0;c<input.length;c++) sum += input[c]?.[i] || 0;
      mono[i]=sum/input.length;
    }
    this._buffer ||= [];
    for(let i=0;i<mono.length;i++) this._buffer.push(mono[i]);
    while(this._buffer.length>=2048){
      const chunk=new Float32Array(2048);
      for(let i=0;i<2048;i++) chunk[i]=this._buffer[i];
      this._buffer.splice(0,2048);
      this.port.postMessage(chunk,[chunk.buffer]);
    }
    return true;
  }
}
registerProcessor("dubly-capture-processor", DublyCaptureProcessor);
