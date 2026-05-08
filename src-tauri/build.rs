fn main() {
    println!("cargo:rustc-link-lib=static=dinput8");
    println!("cargo:rustc-link-lib=static=dxguid");

    tauri_build::build()
}
