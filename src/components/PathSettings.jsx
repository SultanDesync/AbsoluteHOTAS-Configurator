import React from "react";

export function PathSettings({
  iniPath,
  setIniPath,
  controlMapPath,
  setControlMapPath,
  browseIniPath,
  browseControlMapPath,
  loadIni,
  saveIni
}) {
  return (
    <section className="path-row">
      <div className="path-group">
        <label htmlFor="iniPath">AbsoluteHOTAS.ini</label>
        <input
          id="iniPath"
          value={iniPath}
          onChange={(event) => setIniPath(event.target.value)}
          spellCheck="false"
        />
        <button type="button" onClick={browseIniPath}>Browse</button>
      </div>
      <div className="path-group">
        <label htmlFor="controlMapPath">ControlMapCustom</label>
        <input
          id="controlMapPath"
          value={controlMapPath}
          onChange={(event) => setControlMapPath(event.target.value)}
          spellCheck="false"
        />
        <button type="button" onClick={browseControlMapPath}>Browse</button>
      </div>
      <div className="path-actions">
        <button type="button" onClick={loadIni}>Load</button>
        <button type="button" onClick={saveIni}>Save</button>
      </div>
    </section>
  );
}
