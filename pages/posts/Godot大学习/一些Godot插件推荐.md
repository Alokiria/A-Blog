---
title: '一些Godot插件推荐'
date: 2026-10-01
updated: 2026-10-01
categories: Godot大学习
cover: https://images.cnblogs.com/cnblogs_com/blogs/858247/galleries/2486318/o_251204051842_bg-blog10.jpg
tags:
  - Godot
  - 工具
top: 1
---

# 动画类
## AS2P
<font style="color:rgb(31, 35, 40);">全称：Godot AnimatedSprite to AnimationPlayer Converter</font>

<font style="color:rgb(31, 35, 40);">Github：</font>[https://github.com/poohcom1/godot-animated-sprite-2-player](https://github.com/poohcom1/godot-animated-sprite-2-player)

<font style="color:rgb(31, 35, 40);">一个 Godot 插件，用于将动画精灵帧转换为动画播放器中的动画。在 AnimationPlayers 的检查器标签页中增加了一个额外的槽位，用于从 AnimatedSprite 导入精灵。  
</font><!-- 这是一张图片，ocr 内容为： -->
![](https://github.com/poohcom1/godot-animated-sprite-2-player/blob/master/screenshots/inspector-addon.png?raw=true)<!-- 这是一张图片，ocr 内容为： -->
![](https://cdn.nlark.com/yuque/0/2026/gif/61442912/1775987195216-1a2ba045-8f3f-4407-afdc-4c61bd708099.gif)

## <font style="color:rgb(31, 35, 40);">Importality</font>
Github：[https://github.com/nklbdev/godot-4-importality](https://github.com/nklbdev/godot-4-importality)

**<font style="color:rgb(31, 35, 40);">Importality - 是 </font>**[**<font style="color:rgb(9, 105, 218);">Godot</font>**](https://godotengine.org/)**<font style="color:rgb(31, 35, 40);"> 引擎的一个插件，用于导入流行格式的图形和动画</font>**

<font style="color:rgb(31, 35, 40);">Importality 包含将数据从源文件导出为通用内部格式的脚本，以及将内部格式数据导入 Godot 资源的脚本。之后，我决定为其他图形应用添加新的导出脚本</font>

+ <font style="color:rgb(31, 35, 40);">在Godot中添加源图形文件的识别为图像，并具备所有标准的导入功能（对于动画文件，只导入第一帧）。</font>
+ <font style="color:rgb(31, 35, 40);">支持Aseprite（以及LibreSprite）、Krita、Pencil2D、Piskel和Pixelorama文件。未来可能会支持其他格式。</font>
+ <font style="color:rgb(31, 35, 40);">导入文件为：</font>
    - <font style="color:rgb(31, 35, 40);">精灵图集（精灵图集）——带有元数据的纹理;</font>
    - `<font style="color:rgb(31, 35, 40);background-color:rgba(129, 139, 152, 0.12);">SpriteFrames</font>`<font style="color:rgb(31, 35, 40);">基于它创建自己的资源;</font>`<font style="color:rgb(31, 35, 40);background-color:rgba(129, 139, 152, 0.12);">AnimatedSprite2D</font>``<font style="color:rgb(31, 35, 40);background-color:rgba(129, 139, 152, 0.12);">AnimatedSprite3D</font>`
    - `<font style="color:rgb(31, 35, 40);background-color:rgba(129, 139, 152, 0.12);">PackedScene</font>`<font style="color:rgb(31, 35, 40);">即用的：</font>`<font style="color:rgb(31, 35, 40);background-color:rgba(129, 139, 152, 0.12);">Node</font>`
        * `<font style="color:rgb(31, 35, 40);background-color:rgba(129, 139, 152, 0.12);">AnimatedSprite2D</font>`<font style="color:rgb(31, 35, 40);">以及</font>`<font style="color:rgb(31, 35, 40);background-color:rgba(129, 139, 152, 0.12);">AnimatedSprite3D</font>`
        * `<font style="color:rgb(31, 35, 40);background-color:rgba(129, 139, 152, 0.12);">Sprite2D</font>`<font style="color:rgb(31, 35, 40);">，并用</font>`<font style="color:rgb(31, 35, 40);background-color:rgba(129, 139, 152, 0.12);">Sprite3D</font>``<font style="color:rgb(31, 35, 40);background-color:rgba(129, 139, 152, 0.12);">TextureRect</font>``<font style="color:rgb(31, 35, 40);background-color:rgba(129, 139, 152, 0.12);">AnimationPlayer</font>`
+ <font style="color:rgb(31, 35, 40);">在精灵边缘出现了多个避免方法的伪影。</font>
+ <font style="color:rgb(31, 35, 40);">基于网格的和打包式精灵图集布局选项。</font>
+ <font style="color:rgb(31, 35, 40);">具有 的多种节点动画策略。</font>`<font style="color:rgb(31, 35, 40);background-color:rgba(129, 139, 152, 0.12);">AnimationPlayer</font>`
+ <font style="color:rgb(31, 35, 40);">通过外部命令行工具导入任何其他图形格式为普通图片。</font>

<!-- 这是一张图片，ocr 内容为： -->
![](https://cdn.nlark.com/yuque/0/2026/png/61442912/1775987382176-5b477a8c-533c-4816-ba65-0cdc1cfb761c.png)

## Spine
骨骼动画插件

官网下载地址：[https://zh.esotericsoftware.com/spine-godot#%E4%B8%8B%E8%BD%BD-spine-godot-GDExtension](https://zh.esotericsoftware.com/spine-godot#%E4%B8%8B%E8%BD%BD-spine-godot-GDExtension)

# 代码类
## Phantom Camera
更好的相机效果

Github：[https://github.com/ramokz/phantom-camera](https://github.com/ramokz/phantom-camera)

<font style="color:rgb(31, 35, 40);">Phantom Camera 是 Godot 4 的一个插件，旨在为内置和节点提供和简化常见行为——其设计深受 Unity 包 Cinemachine 的启发。</font>`<font style="color:rgb(31, 35, 40);background-color:rgba(129, 139, 152, 0.12);">Camera2D</font>``<font style="color:rgb(31, 35, 40);background-color:rgba(129, 139, 152, 0.12);">Camera3D</font>`

<font style="color:rgb(31, 35, 40);">它允许简单行为，比如跟踪和观察特定节点，并可选地进行平滑/阻尼移动，也可以更高级地实现重构，保持多个节点在视野中，并在特定摄像机位置（即其他节点）之间动态动画，按需操作。</font>`<font style="color:rgb(31, 35, 40);background-color:rgba(129, 139, 152, 0.12);">PhantomCamera</font>`

<!-- 这是一张图片，ocr 内容为： -->
![](https://cdn.nlark.com/yuque/0/2026/png/61442912/1775987758204-4e2a8913-7b99-4e46-b399-4a275b78f951.png)

## <font style="color:rgb(31, 35, 40);">Script IDE</font>
优化Godot内置的代码编辑器

Github：[https://github.com/Maran23/script-ide](https://github.com/Maran23/script-ide)

<font style="color:rgb(31, 35, 40);">将脚本界面转换成类似集成环境的界面。 多行制表符用于在脚本间导航。标签可以拆分。 默认的 Outline 经过了全面改进，现在脚本的所有成员（不仅仅是方法）都用独特的图标显示，方便快速导航。 增强了脚本和大纲的键盘导航。 快速搜索功能。 快速功能覆盖功能。</font>

<font style="color:rgb(31, 35, 40);">特色：</font>

+ <font style="color:rgb(31, 35, 40);">脚本现在以多行制表表显示</font>
+ <font style="color:rgb(31, 35, 40);">脚本标签页可以拆分——将当前脚本作为只读代码编辑显示在主脚本旁边。原始脚本可以通过右键点击重新打开。</font>
+ <font style="color:rgb(31, 35, 40);">大纲进行了全面修订，展示了不仅仅是剧本的方法。其中包括以下成员，拥有独特的图标：</font>
    - <font style="color:rgb(31, 35, 40);">等级（红场）</font>
    - <font style="color:rgb(31, 35, 40);">常数（红圈）</font>
    - <font style="color:rgb(31, 35, 40);">信号（黄色）</font>
    - <font style="color:rgb(31, 35, 40);">导出变量（橙色）</font>
    - <font style="color:rgb(31, 35, 40);">（静电声）变量（红色）</font>
    - <font style="color:rgb(31, 35, 40);">发动机回调函数（蓝色）</font>
    - <font style="color:rgb(31, 35, 40);">（静电声）职能（绿色）</font>
        * <font style="color:rgb(31, 35, 40);">设定者功能（绿色圆圈，圆圈内有箭头指向右侧）</font>
        * <font style="color:rgb(31, 35, 40);">获取函数（绿色圆圈，内部有指向左侧的箭头）</font>
+ <font style="color:rgb(31, 35, 40);">脚本中的所有不同成员都可以通过轮廓过滤器隐藏或重新可见。这允许对应可见的内容进行精细控制（例如，仅显示信号、（Godot）函数等）</font>
+ <font style="color:rgb(31, 35, 40);">A只启用了被点击的过滤器，另一个则再次启用所有过滤器</font>`<font style="color:rgb(31, 35, 40);background-color:rgba(129, 139, 152, 0.12);">Right Click</font>``<font style="color:rgb(31, 35, 40);background-color:rgba(129, 139, 152, 0.12);">Right Click</font>`
+ <font style="color:rgb(31, 35, 40);">大纲可以通过弹窗打开，并带有定义的快捷方式，方便快速导航</font>
+ <font style="color:rgb(31, 35, 40);">你可以用按键（或）在大纲中导航，然后点击</font>`<font style="color:rgb(31, 35, 40);background-color:rgba(129, 139, 152, 0.12);">Arrow</font>``<font style="color:rgb(31, 35, 40);background-color:rgba(129, 139, 152, 0.12);">Page up/Page down</font>``<font style="color:rgb(31, 35, 40);background-color:rgba(129, 139, 152, 0.12);">ENTER</font>`
+ <font style="color:rgb(31, 35, 40);">脚本可以通过弹窗打开，并设置快捷方式，或者点击标签页右上角的三个点，方便快速切换脚本</font>
+ <font style="color:rgb(31, 35, 40);">当前编辑中的脚本会自动在文件系统Dock中被选中</font>
+ <font style="color:rgb(31, 35, 40);">文件可以通过快速搜索弹窗快速搜索，使用</font>`<font style="color:rgb(31, 35, 40);background-color:rgba(129, 139, 152, 0.12);">Shift</font>`<font style="color:rgb(31, 35, 40);">+</font>`<font style="color:rgb(31, 35, 40);background-color:rgba(129, 139, 152, 0.12);">Shift</font>`
+ <font style="color:rgb(31, 35, 40);">你可以找到并快速覆盖超级类中的任何方法，比如</font>`<font style="color:rgb(31, 35, 40);background-color:rgba(129, 139, 152, 0.12);">Alt</font>`<font style="color:rgb(31, 35, 40);">+</font>`<font style="color:rgb(31, 35, 40);background-color:rgba(129, 139, 152, 0.12);">Ins</font>`
+ <font style="color:rgb(31, 35, 40);">插件设计时注重性能，没有多余的功能，运行时没有延迟或卡顿</font>

<font style="color:rgb(31, 35, 40);">定制化：</font>

+ <font style="color:rgb(31, 35, 40);">轮廓在右侧（可以改回左侧）</font>
+ <font style="color:rgb(31, 35, 40);">大纲可以通过 切换。这样可以隐藏或显示它</font>`<font style="color:rgb(31, 35, 40);background-color:rgba(129, 139, 152, 0.12);">File -> Toggle Scripts Panel</font>`
+ <font style="color:rgb(31, 35, 40);">大纲中的顺序可以更改</font>
+ <font style="color:rgb(31, 35, 40);">还可以隐藏私人成员，这包括所有以</font>`<font style="color:rgb(31, 35, 40);background-color:rgba(129, 139, 152, 0.12);">_</font>`
+ <font style="color:rgb(31, 35, 40);">脚本条目列表默认不可见，但可以重新显示</font>

<!-- 这是一张图片，ocr 内容为： -->
![](https://cdn.nlark.com/yuque/0/2026/png/61442912/1775988062543-205484ec-735d-45ee-b9ae-ed4ec6a55fc1.png)

## <font style="color:rgb(31, 35, 40);">Dialogue Manager</font>
<font style="color:rgb(31, 35, 40);">Dialogue Manager 4 是 </font>[<font style="color:rgb(9, 105, 218);">Godot 4.6+</font>](https://godotengine.org/)<font style="color:rgb(31, 35, 40);"> 的一个插件，提供无状态分支对话编辑器和运行时。用脚本式的方式写你的对话，并轻松融入你的游戏中。</font><font style="color:rgb(31, 35, 40);"> </font>

<!-- 这是一张图片，ocr 内容为： -->
![](https://cdn.nlark.com/yuque/0/2026/png/61442912/1776000466432-e2674f64-d7b5-4f4b-bf53-b7b7458e9273.png)

## <font style="color:rgb(31, 35, 40);">Scene Manager</font>
<font style="color:rgb(31, 35, 40);">一个用于管理不同场景之间过渡的工具。</font>

Github：[https://github.com/maktoobgar/scene_manager?tab=readme-ov-file](https://github.com/maktoobgar/scene_manager?tab=readme-ov-file)

具体使用方法见Github

# <!-- 这是一张图片，ocr 内容为： -->
![](https://cdn.nlark.com/yuque/0/2026/png/61442912/1776004780827-b6e3d25c-94e8-4599-ac50-5c8dab0d35d5.png)
## <font style="color:rgb(31, 35, 40);">Godot State Charts</font>
有限状态机插件

Github：[https://github.com/derkork/godot-statecharts?tab=readme-ov-file](https://github.com/derkork/godot-statecharts?tab=readme-ov-file)

<font style="color:rgb(31, 35, 40);">Godot State Charts</font><font style="color:rgb(31, 35, 40);">是 Godot Engine 4 或更高版本的一个扩展，允许你在游戏中使用</font>[<font style="color:rgb(9, 105, 218);">状态图</font>](https://statecharts.dev/)<font style="color:rgb(31, 35, 40);">。状态图类似于有限状态机，但它们更强大，避免了传统有限状态机的</font>[<font style="color:rgb(9, 105, 218);">状态爆炸</font>](https://statecharts.dev/state-machine-state-explosion.html)<font style="color:rgb(31, 35, 40);">问题。</font><!-- 这是一张图片，ocr 内容为： -->
![](https://cdn.nlark.com/yuque/0/2026/gif/61442912/1776005176865-5e9fe52f-517b-4422-ba1e-4fc0afe55ea7.gif)

## <font style="color:rgb(31, 35, 40);">TODO Manager</font>
自动收集在代码中写下的#TODO或者#FIXME标签

Github：[https://github.com/OrigamiDev-Pete/TODO_Manager](https://github.com/OrigamiDev-Pete/TODO_Manager)

<!-- 这是一张图片，ocr 内容为： -->
![](https://cdn.nlark.com/yuque/0/2026/png/61442912/1776005374902-451856ca-3a95-41c7-a712-d08d6ee6c2bd.png)

# 音频类
## <font style="color:rgb(31, 35, 40);">Godot Sound Manager</font>
<font style="color:rgb(31, 35, 40);">一个简单的</font>[<font style="color:rgb(9, 105, 218);">Godot引擎</font>](https://godotengine.org/)<font style="color:rgb(31, 35, 40);">音乐和音效播放器。</font>

<font style="color:rgb(31, 35, 40);">Github：</font>[https://github.com/Acvarc/Godot_soundmanager/tree/main](https://github.com/Acvarc/Godot_soundmanager/tree/main)

+ <font style="color:rgb(31, 35, 40);">合并音频播放器</font>
+ <font style="color:rgb(31, 35, 40);">处理音乐交叉淡入淡出</font>
+ <font style="color:rgb(31, 35, 40);">自动检测声音和音乐的可能音频总线</font>
+ <font style="color:rgb(31, 35, 40);">它会把声音拆分成UI音效和本地音效</font>
+ <font style="color:rgb(31, 35, 40);">支持 GDScript 和 C 语言#</font>

<!-- 这是一张图片，ocr 内容为： -->
![](https://cdn.nlark.com/yuque/0/2026/png/61442912/1776005576440-5ca7ad36-aca3-4324-8882-beae8056c5b7.png)

## <font style="color:rgb(31, 35, 40);">GodotSfxr</font>
简单音效生成器

Github：[https://github.com/tomeyro/godot-sfxr](https://github.com/tomeyro/godot-sfxr)

<font style="color:rgb(31, 35, 40);">Godot 插件，它添加了 SfxrStreamPlayer 节点和 SfxrAudioStream Resource，在编辑器内生成音效。</font>

# <font style="color:rgb(31, 35, 40);">数值与输入类</font>
## <font style="color:rgb(31, 35, 40);">Godot CSV Data Importer</font>
用于管理各种数值数据

Github：[https://github.com/timothyqiu/godot-csv-data-importer](https://github.com/timothyqiu/godot-csv-data-importer)

## <!-- 这是一张图片，ocr 内容为： -->
![](https://cdn.nlark.com/yuque/0/2026/png/61442912/1776005896775-d2e6ef24-c9cc-4e49-b732-49216d65be93.png)
<font style="color:rgb(31, 35, 40);">将 CSV/TSV 文件导入为原生数组或词典。</font>

## <font style="color:rgb(31, 35, 40);">Input Helper for Godot 4</font>
<font style="color:rgb(31, 35, 40);">一个简单的</font>[<font style="color:rgb(9, 105, 218);">Godot 4</font>](https://godotengine.org/)<font style="color:rgb(31, 35, 40);">输入辅助工具。</font>

Github：[https://github.com/nathanhoad/godot_input_helper](https://github.com/nathanhoad/godot_input_helper)

<!-- 这是一张图片，ocr 内容为： -->
![](https://cdn.nlark.com/yuque/0/2026/png/61442912/1776006005179-f7ee38c6-17e5-49e3-94a3-6a97fd84cdf7.png)

+ <font style="color:rgb(31, 35, 40);">检测玩家使用的输入设备</font>
+ <font style="color:rgb(31, 35, 40);">能分辨出几款不同的手柄</font>
+ <font style="color:rgb(31, 35, 40);">获取和设置输入动作按钮和按键</font>
+ <font style="color:rgb(31, 35, 40);">摇滚手柄</font>

使用方法：

<!-- 这是一张图片，ocr 内容为： -->
![](https://cdn.nlark.com/yuque/0/2026/png/61442912/1777475003525-ae8da6e3-1b15-421a-9a17-a178d97392ad.png)

在选中csv文件后，在场景右边有个导入选项，可以设置csv文件的导入

**导入为：**

<!-- 这是一张图片，ocr 内容为： -->
![](https://cdn.nlark.com/yuque/0/2026/png/61442912/1777475399232-1cac43a4-9c35-4aa2-b388-f1ad9393e16d.png)

**CSV Data 与 CSV Translation：**

| **<font style="color:rgb(15, 17, 21);">特性</font>** | **<font style="color:rgb(15, 17, 21);">CSV Data</font>** | **<font style="color:rgb(15, 17, 21);">CSV Translation</font>** | **<font style="color:rgb(15, 17, 21);"></font>** |
| --- | --- | --- | --- |
| **<font style="color:rgb(15, 17, 21);">核心用途</font>** | <font style="color:rgb(15, 17, 21);">作为</font>**<font style="color:rgb(15, 17, 21);">游戏数据</font>**<font style="color:rgb(15, 17, 21);">，用来定义角色属性、道具列表、关卡配置等</font><font style="color:rgb(15, 17, 21);">。</font> | <font style="color:rgb(15, 17, 21);">作为</font>**<font style="color:rgb(15, 17, 21);">翻译文本</font>**<font style="color:rgb(15, 17, 21);">，用于游戏的国际化（i18n）和多语言支持</font><font style="color:rgb(15, 17, 21);">。</font> | <font style="color:rgb(15, 17, 21);"></font> |
| **<font style="color:rgb(15, 17, 21);">数据结构</font>** | <font style="color:rgb(15, 17, 21);">格式</font>**<font style="color:rgb(15, 17, 21);">可自由定义</font>**<font style="color:rgb(15, 17, 21);">，非常灵活。第一行不一定是语言代码，可以是任何你需要的列名。</font> | **<font style="color:rgb(15, 17, 21);">格式固定</font>**<font style="color:rgb(15, 17, 21);">，第一列必须是字符串的唯一标识符（ID），后续列的标题是语言代码，如 </font>`<font style="color:rgb(15, 17, 21);background-color:rgb(235, 238, 242);">en</font>`<font style="color:rgb(15, 17, 21);">、</font>`<font style="color:rgb(15, 17, 21);background-color:rgb(235, 238, 242);">zh</font>`<font style="color:rgb(15, 17, 21);">、</font>`<font style="color:rgb(15, 17, 21);background-color:rgb(235, 238, 242);">ja</font>`<font style="color:rgb(15, 17, 21);">等。</font> | **<font style="color:rgb(15, 17, 21);"></font>** |
| **<font style="color:rgb(15, 17, 21);">导入内容</font>** | <font style="color:rgb(15, 17, 21);">被引擎当作</font>**<font style="color:rgb(15, 17, 21);">资源Resource</font>**<font style="color:rgb(15, 17, 21);">，生成文件后通过 </font>`<font style="color:rgb(15, 17, 21);background-color:rgb(235, 238, 242);">.records</font>`<font style="color:rgb(15, 17, 21);"> API 访问。</font> | <font style="color:rgb(15, 17, 21);">被引擎当作</font><font style="color:rgb(15, 17, 21);"> </font>`**<font style="color:rgb(15, 17, 21);background-color:rgb(235, 238, 242);">Translation</font>**`<br/>**<font style="color:rgb(15, 17, 21);"> </font>****<font style="color:rgb(15, 17, 21);">资源</font>**<font style="color:rgb(15, 17, 21);">，并自动添加至全局翻译系统</font><font style="color:rgb(15, 17, 21);">。</font> | <font style="color:rgb(15, 17, 21);"></font> |
| **<font style="color:rgb(15, 17, 21);">代码调用</font>** | `<font style="color:rgb(15, 17, 21);background-color:rgb(235, 238, 242);">preload("res://data.csv").records</font>` | `<font style="color:rgb(15, 17, 21);background-color:rgb(235, 238, 242);">tr("KEY")</font>`<font style="color:rgb(15, 17, 21);">，引擎会根据当前语言自动返回对应文本。</font> | <font style="color:rgb(15, 17, 21);"></font> |
| **<font style="color:rgb(15, 17, 21);">使用场景</font>** | **<font style="color:rgb(15, 17, 21);">非文本数据</font>**<font style="color:rgb(15, 17, 21);">，尤其是数字或布尔值为主的游戏逻辑数据。</font> | **<font style="color:rgb(15, 17, 21);">纯文本内容</font>**<font style="color:rgb(15, 17, 21);">，例如UI标签、对话文本、系统提示等。</font> | **<font style="color:rgb(15, 17, 21);"></font>** |


**保留文件与跳过文件：**

+ **<font style="color:rgb(15, 17, 21);">保留文件（原样导出）</font>**<font style="color:rgb(15, 17, 21);">：Godot 不处理，将 CSV 原样复制到最终游戏包中。适合运行时用自定义解析器动态加载数据。</font>
+ **<font style="color:rgb(15, 17, 21);">跳过文件（不导入）</font>**<font style="color:rgb(15, 17, 21);">：完全忽略此文件，不会出现在最终游戏包中。可用于临时注释或存储备份。</font>



**分隔符：**

+ <font style="color:rgb(15, 17, 21);">选项：</font>`<font style="color:rgb(15, 17, 21);background-color:rgb(235, 238, 242);">Comma</font>`<font style="color:rgb(15, 17, 21);">（逗号）、</font>`<font style="color:rgb(15, 17, 21);background-color:rgb(235, 238, 242);">Tab</font>`<font style="color:rgb(15, 17, 21);">（制表符）、</font>`<font style="color:rgb(15, 17, 21);background-color:rgb(235, 238, 242);">Semicolon</font>`<font style="color:rgb(15, 17, 21);">（分号）等</font>
+ **<font style="color:rgb(15, 17, 21);">作用</font>**<font style="color:rgb(15, 17, 21);">：指定 CSV 文件中用于分隔每一列数据的字符。</font>
    - <font style="color:rgb(15, 17, 21);">标准 CSV 通常用逗号（</font>`<font style="color:rgb(15, 17, 21);background-color:rgb(235, 238, 242);">,</font>`<font style="color:rgb(15, 17, 21);">），如果你的文件使用其他分隔符（如 TSV 用制表符 </font>`<font style="color:rgb(15, 17, 21);background-color:rgb(235, 238, 242);">\t</font>`<font style="color:rgb(15, 17, 21);">），需要在这里修改，否则解析会出错。</font>

**Headers：**

+ <font style="color:rgb(15, 17, 21);">选项：启用 / 禁用</font>
+ **<font style="color:rgb(15, 17, 21);">作用</font>**<font style="color:rgb(15, 17, 21);">：</font>
    - **<font style="color:rgb(15, 17, 21);">启用</font>**<font style="color:rgb(15, 17, 21);">：把 CSV 的第一行当作列名（键）。导入后，</font>`<font style="color:rgb(15, 17, 21);background-color:rgb(235, 238, 242);">.records</font>`<font style="color:rgb(15, 17, 21);"> </font><font style="color:rgb(15, 17, 21);">会是一个</font><font style="color:rgb(15, 17, 21);"> </font>**<font style="color:rgb(15, 17, 21);">字典数组</font>**<font style="color:rgb(15, 17, 21);">，每个字典的键就是第一行的值，方便通过</font><font style="color:rgb(15, 17, 21);"> </font>`<font style="color:rgb(15, 17, 21);background-color:rgb(235, 238, 242);">row["ColumnName"]</font>`<font style="color:rgb(15, 17, 21);"> </font><font style="color:rgb(15, 17, 21);">读取。</font>
    - **<font style="color:rgb(15, 17, 21);">禁用</font>**<font style="color:rgb(15, 17, 21);">：第一行也被当作普通数据。</font>`<font style="color:rgb(15, 17, 21);background-color:rgb(235, 238, 242);">.records</font>`<font style="color:rgb(15, 17, 21);"> 会是一个 </font>**<font style="color:rgb(15, 17, 21);">二维数组</font>**<font style="color:rgb(15, 17, 21);">（每个元素是字符串数组），你需要通过索引 </font>`<font style="color:rgb(15, 17, 21);background-color:rgb(235, 238, 242);">row[0]</font>`<font style="color:rgb(15, 17, 21);">、</font>`<font style="color:rgb(15, 17, 21);background-color:rgb(235, 238, 242);">row[1]</font>`<font style="color:rgb(15, 17, 21);"> 来访问。</font>

**Detect Numbers：**

+ <font style="color:rgb(15, 17, 21);">选项：启用 / 禁用</font>
+ **<font style="color:rgb(15, 17, 21);">作用</font>**<font style="color:rgb(15, 17, 21);">：</font>
    - **<font style="color:rgb(15, 17, 21);">启用</font>**<font style="color:rgb(15, 17, 21);">：自动将看起来像数字的字符串（如</font><font style="color:rgb(15, 17, 21);"> </font>`<font style="color:rgb(15, 17, 21);background-color:rgb(235, 238, 242);">"123"</font>`<font style="color:rgb(15, 17, 21);">、</font>`<font style="color:rgb(15, 17, 21);background-color:rgb(235, 238, 242);">"3.14"</font>`<font style="color:rgb(15, 17, 21);">）转换为</font><font style="color:rgb(15, 17, 21);"> </font>`<font style="color:rgb(15, 17, 21);background-color:rgb(235, 238, 242);">int</font>`<font style="color:rgb(15, 17, 21);"> </font><font style="color:rgb(15, 17, 21);">或</font><font style="color:rgb(15, 17, 21);"> </font>`<font style="color:rgb(15, 17, 21);background-color:rgb(235, 238, 242);">float</font>`<font style="color:rgb(15, 17, 21);"> </font><font style="color:rgb(15, 17, 21);">类型。</font>
    - **<font style="color:rgb(15, 17, 21);">禁用</font>**<font style="color:rgb(15, 17, 21);">：所有数据都保持为原始字符串类型。</font>

**Force Float：**

+ <font style="color:rgb(15, 17, 21);">选项：启用 / 禁用（通常需要先启用</font><font style="color:rgb(15, 17, 21);"> </font>`<font style="color:rgb(15, 17, 21);background-color:rgb(235, 238, 242);">Detect Numbers</font>`<font style="color:rgb(15, 17, 21);"> </font><font style="color:rgb(15, 17, 21);">才有效）</font>
+ **<font style="color:rgb(15, 17, 21);">作用</font>**<font style="color:rgb(15, 17, 21);">：</font>
    - **<font style="color:rgb(15, 17, 21);">启用</font>**<font style="color:rgb(15, 17, 21);">：检测到的数字</font>**<font style="color:rgb(15, 17, 21);">全部</font>**<font style="color:rgb(15, 17, 21);">转换为</font><font style="color:rgb(15, 17, 21);"> </font>`<font style="color:rgb(15, 17, 21);background-color:rgb(235, 238, 242);">float</font>`<font style="color:rgb(15, 17, 21);">（浮点数）类型，即使原来是整数（如</font><font style="color:rgb(15, 17, 21);"> </font>`<font style="color:rgb(15, 17, 21);background-color:rgb(235, 238, 242);">123</font>`<font style="color:rgb(15, 17, 21);"> </font><font style="color:rgb(15, 17, 21);">→</font><font style="color:rgb(15, 17, 21);"> </font>`<font style="color:rgb(15, 17, 21);background-color:rgb(235, 238, 242);">123.0</font>`<font style="color:rgb(15, 17, 21);">）。</font>
    - **<font style="color:rgb(15, 17, 21);">禁用</font>**<font style="color:rgb(15, 17, 21);">：检测到的整数保持为 </font>`<font style="color:rgb(15, 17, 21);background-color:rgb(235, 238, 242);">int</font>`<font style="color:rgb(15, 17, 21);">，只有带小数点的才转换为 </font>`<font style="color:rgb(15, 17, 21);background-color:rgb(235, 238, 242);">float</font>`<font style="color:rgb(15, 17, 21);">。</font>

:::info
<font style="color:rgb(15, 17, 21);">如果你后续需要统一进行浮点运算，启用这个选项可以避免类型混用带来的麻烦。</font>

:::

**Detect Booleans：**

+ <font style="color:rgb(15, 17, 21);">选项：启用 / 禁用</font>
+ **<font style="color:rgb(15, 17, 21);">作用</font>**<font style="color:rgb(15, 17, 21);">：</font>
    - **<font style="color:rgb(15, 17, 21);">启用</font>**<font style="color:rgb(15, 17, 21);">：将特定的字符串（如</font><font style="color:rgb(15, 17, 21);"> </font>`<font style="color:rgb(15, 17, 21);background-color:rgb(235, 238, 242);">"True"</font>`<font style="color:rgb(15, 17, 21);">/</font>`<font style="color:rgb(15, 17, 21);background-color:rgb(235, 238, 242);">"False"</font>`<font style="color:rgb(15, 17, 21);">、</font>`<font style="color:rgb(15, 17, 21);background-color:rgb(235, 238, 242);">"true"</font>`<font style="color:rgb(15, 17, 21);">/</font>`<font style="color:rgb(15, 17, 21);background-color:rgb(235, 238, 242);">"false"</font>`<font style="color:rgb(15, 17, 21);">、</font>`<font style="color:rgb(15, 17, 21);background-color:rgb(235, 238, 242);">"1"</font>`<font style="color:rgb(15, 17, 21);">/</font>`<font style="color:rgb(15, 17, 21);background-color:rgb(235, 238, 242);">"0"</font>`<font style="color:rgb(15, 17, 21);"> </font><font style="color:rgb(15, 17, 21);">等）自动转换为布尔值</font><font style="color:rgb(15, 17, 21);"> </font>`<font style="color:rgb(15, 17, 21);background-color:rgb(235, 238, 242);">true</font>`<font style="color:rgb(15, 17, 21);">/</font>`<font style="color:rgb(15, 17, 21);background-color:rgb(235, 238, 242);">false</font>`<font style="color:rgb(15, 17, 21);">。</font>
    - **<font style="color:rgb(15, 17, 21);">禁用</font>**<font style="color:rgb(15, 17, 21);">：这些值会保持为字符串（</font>`<font style="color:rgb(15, 17, 21);background-color:rgb(235, 238, 242);">"True"</font>`<font style="color:rgb(15, 17, 21);">、</font>`<font style="color:rgb(15, 17, 21);background-color:rgb(235, 238, 242);">"False"</font>`<font style="color:rgb(15, 17, 21);"> 等）。</font>

```python
extends Node

func _ready():
    # 通过 preload 加载 CSV 资源
    var csv_data = preload("res://data.csv")
    
    # 打印所有记录
    print(csv_data.records) 
    # 输出: [{Name:Alice, Score:100, IsUnlocked:True}, {Name:Bob, Score:85, IsUnlocked:False}]

    # 访问第一条记录
    var first_row = csv_data.records[0]
    print(first_row.Name) # 输出: Alice
    print(first_row.Score) # 输出: 100
```



# 操作优化类
## <font style="color:rgb(31, 35, 40);">Blender 3D Shortcuts in Godot</font>
使Godot的3D编辑变成Blender习惯

Github：[https://github.com/imjp94/gd-blender-3d-shortcuts](https://github.com/imjp94/gd-blender-3d-shortcuts)

<!-- 这是一张图片，ocr 内容为： -->
![](https://cdn.nlark.com/yuque/0/2026/gif/61442912/1776006262029-2bbba1e7-754b-4bf7-be16-7201c7820c26.gif)

+ <font style="color:rgb(31, 35, 40);">用“G”、“R”、“S”和“H”键进行变形以隐藏</font>
+ <font style="color:rgb(31, 35, 40);">用“ALT”修正符还原变换</font>
+ <font style="color:rgb(31, 35, 40);">可视化约束轴</font>
+ <font style="color:rgb(31, 35, 40);">无缝使用Godot空间编辑器设置（“使用本地空间”、“使用吸附”、“吸附设置”）</font>
+ <font style="color:rgb(31, 35, 40);">类型变换值</font>
+ <font style="color:rgb(31, 35, 40);">用“Z”切换显示模式</font>

# 发行相关
## <font style="color:rgb(31, 35, 40);">Godotsize</font>
<font style="color:rgb(31, 35, 40);">GodotSize 是一个简单的工具，帮助你识别项目中哪些文件占用最多空间。它会检查项目文件夹中每个文件的大小（或导入文件大小，见下文），并以列表形式显示，占用空间较多的文件会显示在顶部</font>

<font style="color:rgb(31, 35, 40);">Github：</font>[https://github.com/the-sink/godotsize](https://github.com/the-sink/godotsize)

<!-- 这是一张图片，ocr 内容为： -->
![](https://cdn.nlark.com/yuque/0/2026/png/61442912/1776006375880-5bd50e85-058c-44e6-b282-c2dc2a074b65.png)

## GodotSteam Server GDExtension
<font style="color:rgb(51, 51, 51);">Steamworks Godot Engine 的 API 插件。</font>

<font style="color:rgb(51, 51, 51);">用于调用steam功能，排行榜，成就，玩家统计，云存档等</font>

官网：[https://godotsteam.com/](https://godotsteam.com/)

下载：[https://godotengine.org/asset-library/asset/2445](https://godotengine.org/asset-library/asset/2445)

