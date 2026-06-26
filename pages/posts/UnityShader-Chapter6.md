---
title: '第六章 Unity中的基础光照'
date: 2026-04-05
updated: 2026-06-15
categories: UnityShader入门精要-URP改编
tags:
  - UnityShader
  - Shaderlab
  - TA
  - 图形学
top: 1
---

# 基础知识
## 光源
在实时渲染中，我们通常把光源当成一个没有体积的点，用`l`来表示它的方向。

在光学中，我们使用**辐照度（irradiance）**来量化光，在计算光照模型的时候，我们需要知道一个物体表面的辐照度，而物体表面往往是和`l`不垂直的，我们可以使用光源方向`l`和表面法线`n`之间的夹角的余弦值来得到，需要注意的是，这里默认方向矢量的模都为1

因为辐照度是和照射到物体表面时光线之间的距离`d/cosθ`成反比，因此辐照度就与`cosθ`成正比，`cosθ`可以用光源方向`l`和表面法线`n`的点积来得到，这是使用点击来计算辐照度的由来。

## 吸收和散射
光线由光源发射出来后，就会与一些物体相交，通常相交的结果有两个，散射（scattering）和吸收（absorption）

散射只改变光线的方向，不改变光线的密度和颜色，而吸收只改变光线的密度和颜色，不改变光线的方向。

光线在物体表面经过散射后，有两种方向，一种会散射到物体内部，称为**折射（refraction）**或**透射（transmission）**；另一种将会散射到外部，称为**反射（reflection）**

为了区分这两种不同的散射方向，我们在光照模型中使用了不同的部分来计算它们：**高光反射（specular）**部分表示物体表面是如何反射光线的，**漫反射（diffuse）**部分则表示有多少光线会被折射、吸收和散射出表面。

根据入射光线的数量和方向，我们可以计算出出射光线的数量和方向，我们通常使用**出射度（exitance）**来描述它，辐照度和出射度之间是满足线性关系的，而他们之间的比值就是材质的漫反射和高光反射的属性

## 着色
着色（shading）是指，根据材质属性（如漫反射属性）、光源信息（如光源方向、辐照度），使用一个等式去计算沿某个观察方向的出射度的过程，我们也把这个等式称为**光照模型（Lighting Model）**

## BRDF关照模型
BRDF大多使用一个数学公式来表示（详见GAMES101），并且提供了一些参数来调整材质属性。当给定入射光线的方向和辐照度后，BRDF可以给出某个出射方向上的光照能量分布，本章涉及的BRDF都是对真实场景进行理想化和简化后的模型，也就是说，它们并不能真实的反映物体与光线之间的交互，这些光照模型被称为经验模型。尽管如此， 这些经验模型还是被应用了很多年，因为

**计算机图形学的第一定律：如果它看起来是对的，那么它就是对的。**



# 标准光照模型-Phone光照模型
虽然光照模型有很多种，但在早期的游戏引擎中往往只使用一个光照模型，就是标准光照模型，实际上在BRDF理论提出之前，标准光照模型就被广泛使用了

标准光照模型由著名学者裴祥风（Bui Tuong Phong，这是在越南出生的美国人）于1973年提出，所以又被称为**Phone光照模型**，这个模型只关心直接光照，也就是那些直接从光源发射出来照射到物体表面后，经过物体表面的一次反射直接进入摄像机的光线。

它把进入摄像机的光线分为4个部分，每个部分使用一种方法来计算它们的贡献度

+ **自发光（emissive）部分：** 用于描述当给定一个方向时，一个表面本身会向该方向发射多少辐射量。需要注意的是，如果没有使用全局光照，自发光的表面并不会照亮周围的物体，而是它本身看起来更亮了而已。
+ **高光反射（specular）部分：** 用于描述当光线从光源照射到模型表面时，该表面会在完全镜面反射方向散射多少辐射量。
+ **漫反射（diffuse）部分：** 用于描述当光线从光源照射到模型表面时，该表面会向每个方向散射多少辐射量。
+ **环境光（ambient）部分：** 用于描述其他所有的间接光照。

## 环境光
虽然标准光照模型的重点在于描述直接光照，但在真实的世界中，物体也可以被间接光照（indirect light）所照亮。间接光照指的是，光线通常会在多个物体之间反射，最后进入摄像机，也就是说，在光线进入摄像机之前，经过了不止一次的物体反射。

在标准光照模型中，我们使用了一种被称为环境光的部分来近似模拟间接光照。环境光的计算非常简单，通常是一个全局变量，即场景中的所有物体都使用这个环境光。$g_{ambient}$通常是一个常量

$c_{ambient}=g_{ambient}$

在Unity中，场景的环境光可以在`Window -> Rendering -> Lighting -> Environment -> Environment Lighting`中控制，如图

<!-- 这是一张图片，ocr 内容为： -->
![环境光设置](https://cdn.nlark.com/yuque/0/2026/png/61442912/1780343103927-342d6efe-397f-4215-b40f-00fcb130ae7b.png)

在Shader中，我们只需要通过Unity的内置变量`unity_AmbientSky`就可以得到环境光的信息，但是这个获得的环境光是一个全局统一的值，不受空间环境影响，所以在这里，我们会使用球谐光照`SampleSH(normal)`来获取环境光，这种方式获取的环境光更加真实一点，至于原理这里先不详细说明。



## 自发光
光线也可以直接由光源发射进入摄像机，而不需要经过任何物体的反射。标准光照模型使用自发光来计算这个部分的贡献度。它的计算也很简单，就是直接使用了该材质的自发光颜色：

$$ c_{emissive}=g_{emissive} $$

通常在实时渲染中，自发光的表面往往并不会照亮周围的表面，也就是这不是个光源。在Unity5引入的全新的全局光照系统则可以模拟这类自发光物体对周围物体的影响。

在Shader计算自发光也很简单，只需要在片元着色器输出最后的颜色之前，把材质的自发光颜色添加到输出颜色上即可。

## 漫反射
漫反射光照是用于对那些被物体表面随机散射到各个方向的辐射度进行建模的。在漫反射中，视角的位置是不重要的，因为反射是完全随机的，因此可以认为在任何反射方向上的分布都是一样的。

但是，入射光线的角度很重要。

漫反射光照符合**兰伯特定律（Lambert's law）**：反射光线的强度与表面法线和光源方向之间的夹角的余弦值成正比。因此，漫反射部分的计算如下

$$ c_{diffuse}=(c_{light}·m_{diffuse})max(0,\hat{n}·\hat{l}) $$

其中，$\hat{n}$ 是表面法线，$\hat{l}$ 是指向光源的单位矢量，$m_{diffuse}$ 是材质的漫反射颜色，$c_{light}$ 是光源颜色。

需要注意的是，我们需要防止法线与光源方向点乘的结果为负值，为此，我们使用取最大值的函数来将其截取到0，这可以防止物体被从后面来的光源照亮。

在Shader中还可以使用HLSL的另一个函数来达到同样的目的，即`saturate`函数

+ **函数：** `saturate(x)`
+ **参数：** x为用于操作的标量或者矢量，可以是float，float2，float3等类型
+ **描述：** 把x截取在[0, 1]范围内，如果x是一个矢量，那么会对它的每一个分量进行这样的操作

:::info
`saturate(x)`是`clamp(x, min, max)`的一个特例，即min为0，max为1时的特例

:::

### 教学：逐顶点漫反射
在Unity中新建一个场景，在`Window -> Rendering -> Lighting -> Environment -> Skybox Material`中去掉场景的天空盒子。

新建一个Unity Shader，名为Chapter6-DiffuseVertexLevel

右键Shader创建一个材质名为，DiffuseVertexLevelMat

打开Unity Shader文件

首先，我们需要给这个Shader起一个名字：

```shaderlab
Shader "Unity Shaders Book/Chapter6/Diffuse Vertex-Level" 
{

}
```

为了得到并且控制材质的漫反射颜色， 我们首先在Shader的Properties语义块中声明了一个Color类型的属性，并把它的初始值设置为白色：

```shaderlab
Properties
{
    _Diffuse ("Diffuse", Color) = (1, 1, 1, 1)
}
```

然后，我们在SubShader语义块中定义了一个Pass语义块，这是因为顶点/片元着色器需要写在Pass里面，我们在Pass的第一行指明了该Pass的光照模式：

```shaderlab
SubShader
{
    Tags { "RenderPipeline"="UniversalPipeline" }
    Pass
    {
        Tags { "LightMode" = "UniversalForward" }
```

:::info
LightMode标签是Pass标签中的一种，它用于定义该Pass在Unity的光照流水线中的角色，在第九章有详解，这里只需要知道，只有定义了正确的LightMode，我们才能正常得到一些Unity的内置光照变量，例如下面要讲的GetMainLight().color

:::

然后，我们使用HLSLPROGRAM和ENDHLSL来包围HLSL代码。首先使用#pragma指令告诉Unity，我们定义的顶点着色器和片元着色器叫什么名字，这里命名为`vert`和`frag`

```shaderlab
HLSLPROGRAM
#pragma vertex vert
#pragma fragment frag
...
ENDHLSL
```

为了使用Unity的一些变量，如后面的GetMainLight().color，还需要包含进Unity的内置文件Lighting.hlsl

```shaderlab
#include "Packages/com.unity.render-pipelines.universal/ShaderLibrary/Lighting.hlsl"
```

为了在Shader中使用Properties语义块中声明的属性，我们需要定义一个相匹配的变量：

```shaderlab
CBUFFER_START(UnityPerMaterial)
half4 _Diffuse;
CBUFFER_END
```

在URP中，我们在需使用CBUFFER_START(UnityPerMaterial)和CBUFFER_END包裹所有的有关材质的参数，兼容SRP Batcher以优化性能，降低渲染开销，这样我们就得到了漫反射中重要的材质的漫反射属性。

:::info
SRP Batcher的原理简单来讲就是把所有的材质单独放在一个常量缓冲区中单独处理，避免许多使用同一个材质但位置和形变不同的物体在DrawCall（绘制）时对材质反复进行设置，使用SRP Batcher后，所有材质一致的物体一共只会执行一次对材质的设置，只需要处理自身的形变相关的矩阵变换即可

可以在Inspector中查看是否兼容了SRP Batcher，如果是compatible则是已经兼容了，如果是not compatible则是不兼容

<!-- 这是一张图片，ocr 内容为： -->
![兼容](https://cdn.nlark.com/yuque/0/2026/png/61442912/1779767769053-1e31ff3b-84ce-4c1b-a66a-97e2b4321b69.png)<!-- 这是一张图片，ocr 内容为： -->
![不兼容](https://cdn.nlark.com/yuque/0/2026/png/61442912/1779767837693-b98fa153-516f-4012-a983-367c943a8f8d.png)

:::

然后我们定义顶点着色器的输入和输出结构体，输出结构体同时也是片元着色器的输入结构体：

```shaderlab
struct Attributes
{ 
    float4 positionOS : POSITION;
    float3 normalOS : NORMAL;
};

struct Varyings
{
    float4 positionHCS : SV_POSITION;
    half3 color : TEXCOORD0;
};
```

为了访问顶点的法线，我们需要在Attributes中定义一个normalOS变量，并通过NORMAL语义来告诉Unity要把模型顶点的法线信息存储到normalOS变量中。为了把顶点着色器中计算得到的光照颜色传递给片元着色器，我们需要在Varyings中定义一个color变量，但不是必须要用COLOR语义，也可以用TEXCOORDn

然后下面就是重要的顶点着色器，我们将在顶点着色器中实现一个逐顶点的漫反射光照：

```shaderlab
Varyings vert (Attributes IN)
{
    Varyings OUT;
    OUT.positionHCS = TransformObjectToHClip(IN.positionOS.xyz);

    Light mainLight = GetMainLight();
    half3 normalWS = normalize(mul(IN.normalOS, (float3x3)unity_WorldToObject));
    half3 lightDirWS = mainLight.direction;
    half3 ambient = SampleSH(normalWS);
    half3 diffuse = mainLight.color * _Diffuse.rgb * saturate(dot(normalWS, lightDirWS));

    OUT.color = ambient + diffuse;
    return OUT;
}
```

我们首先使用Unity内置的物体空间变换到裁剪空间的`TransformObjectToHClip`方法来讲传入的顶点坐标变换到裁剪空间（以前的老方法是使用内置的MVP矩阵`UNITY_MATRIX_MVP`与之相乘得到），接下来我们通过Unity的内置方法`SampleSH(normalWS)`得到了环境光部分

:::info
URP将场景中所有类型的环境光（天空盒、渐变、单色等）统一预处理成“球谐光照”（SH）数据。使用`SampleSH`并传入世界空间的法线方向，即可动态采样出贴合场景的环境光。

:::

然后就是真正计算漫反射的部分，我们已经知道了材质的漫反射颜色`_Diffuse`以及顶点法线`IN.normalOS`。我们还需要知道光源的颜色和强度信息以及光源的方向。URP中使用 `GetMainLight().color`来访问该Pass处理的光源的颜色和强度信息（想要得到正确的值需要定义合适的`LightMode`标签）

而光源的方向由`GetMainLight().direction`来得到，需要注意的是，这里对光源方向的计算不具有通用性，只有在只有一个光源且为平行光的时候才有效。

在计算法线与光源方向的点积前，需要把二者变换到同一坐标空间中才有效，这里我们选择世界空间。

所以我们需要把在模型空间中的法线`IN.normalOS`变换到世界空间，我们需要模型空间变换到世界空间的矩阵的逆转置矩阵，这里使用了一个Unity的内置矩阵`unity_WorldToObject`，这个是世界空间变换到模型空间的矩阵，也就是它的逆矩阵，这里只需要调换它在`mul`中的位置即可，可以得到与转置矩阵相同的矩阵乘法，用这样的方法就得到了与逆转置矩阵相同的效果。

除此之外，还需要对它们进行归一化处理，为了防止点积出现负值，还需要使用`saturate`函数。

最后我们对环境光和漫反射光部分相加，得到最终的光照结果。

由于所有的计算都在顶点着色器中实现了，因此片元着色器中的代码很简单，只需要直接把顶点颜色输出即可：

```shaderlab
half4 frag (Varyings IN) : SV_Target
{
    return half4(IN.color, 1.0);
}
```

最后，我们需要把这个Unity Shader的回调shader设置为内置的Simple Lit着色器：

```shaderlab
Fallback "Universal Render Pipeline/Simple Lit"
```

下面将附上完整代码：

```shaderlab
Shader "Unlit/DiffuseVertex"
{
    Properties
    {
        _Diffuse ("Diffuse", Color) = (1.0, 1.0, 1.0, 1.0)
    }
    SubShader
    {
        Tags { "RenderPipeline" = "UniversalPipeline" }
        Pass
        {
            Tags { "LightMode" = "UniversalForward" }
            HLSLPROGRAM
            #pragma vertex vert
            #pragma fragment frag

            #include "Packages/com.unity.render-pipelines.universal/ShaderLibrary/Core.hlsl"
            #include "Packages/com.unity.render-pipelines.universal/ShaderLibrary/Lighting.hlsl"

            CBUFFER_START(UnityPerMaterial)
            half4 _Diffuse;
            CBUFFER_END

            struct Attributes
            { 
                float4 positionOS : POSITION;
                float3 normalOS : NORMAL;
            };

            struct Varyings
            {
                float4 positionHCS : SV_POSITION;
                half3 color : TEXCOORD0;
            };

            Varyings vert (Attributes IN)
            {
                Varyings OUT;
                OUT.positionHCS = TransformObjectToHClip(IN.positionOS.xyz);
  
                Light mainLight = GetMainLight();
                half3 normalWS = normalize(TransformObjectToWorldNormal(IN.normalOS));
                half3 lightDirWS = mainLight.direction;
                half3 ambient = SampleSH(normalWS);
                half3 diffuse = mainLight.color * _Diffuse.rgb * saturate(dot(normalWS, lightDirWS));

                OUT.color = ambient + diffuse;
                return OUT;
            }

            half4 frag (Varyings IN) : SV_Target
            {
                return half4(IN.color, 1.0);
            }
            ENDHLSL
        }
    }
    Fallback "Universal Render Pipeline/Simple Lit"
}

```

效果如下：



<!-- 这是一张图片，ocr 内容为： -->
![逐顶点漫反射](https://cdn.nlark.com/yuque/0/2026/png/61442912/1777314626945-f9fa9780-8bdb-48ff-963d-43e5aefbace9.png)

:::info
这种在顶点着色器中计算光照，片元着色器只管输出颜色，逐顶点的方式，又被称为 **高洛德（Gouraud）着色**

:::

这里给个使用传统渲染管道的shader：

```shaderlab
Shader "Unlit/Chapter6-DiffuseVertex"
{
    Properties
    {
        _Diffuse ("Diffuse", Color) = (1, 1, 1, 1)
    }
    SubShader
    {
        Pass
        {
            Tags { "LightMode" = "ForwardBase" }
            CGPROGRAM
            #pragma vertex vert
            #pragma fragment frag
            
            #include "Lighting.cginc"

            fixed4 _Diffuse;

            struct a2v
            {
                float4 vertex : POSITION;
                float3 normal : NORMAL;
            };

            struct v2f
            {
                float4 pos : SV_POSITION;
                fixed3 color : COLOR;
            };
            v2f vert (a2v v)
            {
                v2f o;
                o.pos = UnityObjectToClipPos(v.vertex);
                fixed3 ambient = UNITY_LIGHTMODEL_AMBIENT.xyz;

                fixed3 worldNormal = normalize(mul(v.normal, (float3x3)unity_WorldToObject));
                fixed3 worldLightDir = normalize(_WorldSpaceLightPos0.xyz);

                fixed3 diffuse = _LightColor0.rgb * _Diffuse.rgb * saturate(dot(worldNormal, worldLightDir));

                o.color = ambient + diffuse;

                return o;
            }

            fixed4 frag (v2f i) : SV_Target
            {
                return fixed4(i.color, 1.0);
            }
            ENDCG
        }
    }
    FallBack "Diffuse" 
}
```

<!-- 这是一张图片，ocr 内容为： -->
![传统渲染管道逐顶点漫反射](https://cdn.nlark.com/yuque/0/2026/png/61442912/1777253583613-3f226057-e859-43c7-a711-cd4ab2014ec3.png)

:::info
URP渲染出来的效果偏白是因为它的环境光（ambient）计算方式，是球谐环境光 SampleSH，环境光偏白，内置渲染管线的环境光几乎没有，如果把环境光去掉，这两者效果一样。  

:::

### 实践：逐像素漫反射
与逐顶点计算区别很小，只是我们将漫反射的计算放到了片元着色器中计算。

在顶点着色器中，我们只需要计算出世界空间下顶点法线并传到片元着色器中即可：

```shaderlab
Varyings vert (Attributes IN)
{
    Varyings OUT;
    OUT.positionHCS = TransformObjectToHClip(IN.positionOS.xyz);
    OUT.normalWS = TransformObjectToWorldNormal(IN.normalOS);
    return OUT;
}
```

:::info
需要注意的是，这里没有使用`mul(IN.normalOS, (float3x3)unity_WorldToObject)`，而是使用了URP的一个新的内置方法`TransformObjectToWorldNormal()`，专门为计算法线的模型空间变换世界空间。

:::

然后漫反射的计算方式与逐顶点的一样，不再过多赘述：

```shaderlab
half4 frag (Varyings IN) : SV_Target
{
    Light mainLight = GetMainLight();
    half3 normalWS = normalize(IN.normalWS);
    half3 lightDirWS = mainLight.direction;

    half3 ambient = SampleSH(normalWS);

    half3 diffuse = mainLight.color * _Diffuse.rgb * saturate(dot(normalWS, lightDirWS));

    half3 finalColor = ambient + diffuse;
    return half4(finalColor, 1.0);
}
```

下面将附上完整代码：

```shaderlab
Shader "Unlit/DiffusePixel"
{
    Properties
    {
        _Diffuse ("Diffuse", Color) = (1.0, 1.0, 1.0, 1.0)
    }
    SubShader
    {
        Tags { "RenderPipeline"="UniversalPipeline" }
        Pass
        {
            Tags { "LightMode" = "UniversalForward" }
            HLSLPROGRAM
            #pragma vertex vert
            #pragma fragment frag

            #include "Packages/com.unity.render-pipelines.universal/ShaderLibrary/Core.hlsl"
            #include "Packages/com.unity.render-pipelines.universal/ShaderLibrary/Lighting.hlsl"

            CBUFFER_START(UnityPerMaterial)
            half4 _Diffuse;
            CBUFFER_END

            struct Attributes
            { 
                float4 positionOS : POSITION;
                float3 normalOS : NORMAL;
            };

            struct Varyings
            {
                float4 positionHCS : SV_POSITION;
                float3 normalWS : TEXCOORD0;
            };

            Varyings vert (Attributes IN)
            {
                Varyings OUT;
                OUT.positionHCS = TransformObjectToHClip(IN.positionOS.xyz);
                OUT.normalWS = TransformObjectToWorldNormal(IN.normalOS);
                return OUT;
            }

            half4 frag (Varyings IN) : SV_Target
            {
                Light mainLight = GetMainLight();
                half3 normalWS = normalize(IN.normalWS);
                half3 lightDirWS = mainLight.direction;

                half3 ambient = SampleSH(normalWS);

                half3 diffuse = mainLight.color * _Diffuse.rgb * saturate(dot(normalWS, lightDirWS));

                half3 finalColor = ambient + diffuse;
                return half4(finalColor, 1.0);
            }
            ENDHLSL
        }
    }
    Fallback "Universal Render Pipeline/Simple Lit"
}

```

效果如下：

<!-- 这是一张图片，ocr 内容为： -->
![逐像素漫反射](https://cdn.nlark.com/yuque/0/2026/png/61442912/1777314795973-9479c289-46ad-49ef-af69-be4cbc114a56.png)

### 半兰伯特模型
以上兰伯特模型实现的光照效果，有一个问题存在，在光照无法到达的区域，模型的外观通常是全黑的，没有任何明暗变化，这使得模型的背光部看起来就像个平面，失去了模型的细节。实际上我们可以通过添加环境光来得到非全黑的效果，但仍然无法解决背光明暗一样的缺点。

Value公司在开发游戏《半条命》时，提出了一种技术，由于该技术只在原兰伯特光照模型的基础上进行了一个简单的修改，因此被称为半兰伯特光照模型。

广义的半兰伯特关照模型的公式如下：

$c_{diffuse}=(c_{light}·m_{diffuse})(α(\hat{n}·\hat{l})+β)$

与原兰伯特模型相比，半兰伯特模型没有使用`max`操作来防止$\hat{n}$和$\hat{l}$的点积为负值，而是对其结果进行了一个$α$倍的缩放再加上一个$β$大小的偏移，绝大多数情况下，$α$和$β$的值为 0.5，即公式为：

$c_{diffuse}=(c_{light}·m_{diffuse})(0.5(\hat{n}·\hat{l})+0.5)$

通过这样的方法，我们可以把$\hat{n}·\hat{l}$的结果范围从[-1, 1]映射到[0, 1]范围内。也就是说，对于模型的背光面，在原兰伯特模型中点积结果将映射到同一个值，即 0 值上；而在半兰伯特模型中，背光面也可以有明暗变化，不同的点积结果会映射到不同值上。

需要注意的是，半兰伯特是没有任何物理依据的，它仅仅是一个视觉加强效果。

对上一节的代码做一个简单修改就可以实现：

```shaderlab
half4 frag (Varyings IN) : SV_Target
{
    Light mainLight = GetMainLight();
    half3 normalWS = normalize(IN.normalWS);
    half3 lightDirWS = mainLight.direction;

    half3 ambient = SampleSH(normalWS);

    half halfLambert = dot(normalWS, lightDirWS) * 0.5 + 0.5;
    half3 diffuse = mainLight.color * _Diffuse.rgb * halfLambert;

    half3 color = ambient + diffuse;
    return half4(color, 1.0);
}
```

下面附上完整代码：

```shaderlab
Shader "Unlit/HalfLambert"
{
    Properties
    {
        _Diffuse ("Diffuse", Color) = (1.0, 1.0, 1.0, 1.0)
    }
    SubShader
    {
        Tags { "RenderPipeline"="UniversalPipeline" }
        Pass
        {
            Tags { "LightMode" = "UniversalForward" }
            HLSLPROGRAM
            #pragma vertex vert
            #pragma fragment frag

            #include "Packages/com.unity.render-pipelines.universal/ShaderLibrary/Core.hlsl"
            #include "Packages/com.unity.render-pipelines.universal/ShaderLibrary/Lighting.hlsl"

            CBUFFER_START(UnityPerMaterial)
            half4 _Diffuse;
            CBUFFER_END

            struct Attributes
            { 
                float4 positionOS : POSITION;
                float3 normalOS : NORMAL;
            };

            struct Varyings
            {
                float4 positionHCS : SV_POSITION;
                float3 normalWS : TEXCOORD0;
            };

            Varyings vert (Attributes IN)
            {
                Varyings OUT;
                OUT.positionHCS = TransformObjectToHClip(IN.positionOS.xyz);
                OUT.normalWS = TransformObjectToWorldNormal(IN.normalOS);
                return OUT;
            }

            half4 frag (Varyings IN) : SV_Target
            {
                Light mainLight = GetMainLight();
                half3 normalWS = normalize(IN.normalWS);
                half3 lightDirWS = mainLight.direction;
                
                half3 ambient = SampleSH(normalWS);

                half halfLambert = dot(normalWS, lightDirWS) * 0.5 + 0.5;
                half3 diffuse = mainLight.color * _Diffuse.rgb * halfLambert;

                half3 finalColor = ambient + diffuse;
                return half4(finalColor, 1.0);
            }
            ENDHLSL
        }
    }
    Fallback "Universal Render Pipeline/Simple Lit"
}

```

效果如下：

<!-- 这是一张图片，ocr 内容为： -->
![半兰伯特模型](https://cdn.nlark.com/yuque/0/2026/png/61442912/1777314822586-bc1d7285-b1b3-4e92-8f18-a87af98edb17.png)

## 高光反射-Phong光照模型
这里的高光发射是一种经验模型，也就是说，它并不完全符合真实世界的高光反射现象。它可以用于计算那些沿着完全镜面反射方向被反射的光线，这可以让物体看起来是有光泽的。

计算高光反射需要知道很多东西，如表面法线、视角方向、光源方向、反射方向等，我们假设这些矢量都是单位是矢量。

在这四个矢量中，我们实际上只需要知道其中 3 个即可，而第四个矢量——反射方向可以通过其他信息计算得到：

$\hat{r}=2(\hat{n}·\hat{l})\hat{n}-\hat{l}$

<!-- 这是一张图片，ocr 内容为： -->
![使用Phong模型计算高光反射](https://cdn.nlark.com/yuque/0/2026/png/61442912/1777255206090-5e1e9088-ebb4-4f00-baf4-32d8886bc5d9.png)

其中 $(\hat{n}·\hat{l})\hat{n}$ 指的是 $\hat{l}$在$\hat{n}$ 上的投影向量。

:::info
单位矢量的点积，可以表示两个矢量间的`cosθ`值，也可以表示这两个矢量互相之间的投影的长度

:::

上述公式很简单，幸运的是在Cg/HLSL中，提供了计算反射方向的函数`reflect`

:::info
函数：reflect(i, n)

参数：$i$，入射方向；$n$，法线方向。可以是float，float2，float3等类型

描述：给出入射方向$i$和法线方向$n$时，reflect函数可以返回反射方向

注意的是，这里的入射方向是，从光源到反射点，在计算的时候要用对原来的$l$取反方向

:::

这样，我们就可以利用 Phong 模型来计算高光反射部分：

$c_{specular}=(c_{light}·m_{specular})max(0,\hat{v}·\hat{r})^{m_{smoothness}}$

其中，$m_{smoothness}$ 是材质的 **光滑度（smoothness）** ，也被称为反光度（shininess）。它用于控制高光区域“亮点”有多宽，$m_{smoothness}$ 越大，亮点就越小。$m_{specular}$ 是材质的高光反射颜色，它用于控制该材质对于高光反射的强度和颜色。$c_{light}$ 则是光源的颜色和强度。同样这里也要防止$\hat{v}·\hat{r}$的结果为负数。

### 教学：逐顶点高光反射
为了在材质面板中能够方便地控制高光反射属性，我们在Shader的Properties语义块中声明了三个属性：

```shaderlab
Properties
{
    _Diffuse ("Diffuse", color) = (1.0, 1.0, 1.0, 1.0)
    _Specular ("Specular", color) = (1.0, 1.0, 1.0, 1.0)
    _Smoothness ("Smoothness", Range(8.0, 256)) = 20
}
```

新添加的`Specular`用于控制材质的高光反射颜色，而`_Smoothness`用于控制高光区域的大小。

其他的都与漫反射部分类似，不再赘述

重点放在顶点着色器中，我们在顶点着色器中计算了包含高光反射的光照模型

```shaderlab
Varyings vert(Attributes IN)
{
    Varyings OUT;
    OUT.positionHCS = TransformObjectToHClip(IN.positionOS.xyz);
    Light mainLight = GetMainLight();
    half3 normalWS = normalize(TransformObjectToWorldNormal(IN.normalOS));
    half3 lightDirWS = mainLight.direction;
    half3 ambient = SampleSH(normalWS);
    half3 diffuse = mainLight.color.rgb * _Diffuse.rgb * saturate(dot(normalWS, lightDirWS));
    // 以上代码与漫反射的一致

    // 计算反射光线r
    half3 reflectDir = normalize(reflect(-lightDirWS, normalWS));

    // 计算世界空间下的顶点坐标
    float3 positionWS = TransformObjectToWorld(v.positionOS.xyz);
    // 计算视角方向v
    half3 viewDirWS = normalize(_WorldSpaceCameraPos.xyz - positionWS);

    // 计算高光部分
    half3 specular = mainLight.color * _Specular.rgb * pow(saturate(dot(reflectDir, viewDirWS)), _Smoothness);

    OUT.color = ambient + diffuse + specular;
    return OUT;
}
```

其中漫反射部分与上一节的一模一样，对于高光反射部分，我们首先计算了入射光线方向关于表面法线的反射方向`reflectDir`。由于`reflect`函数的入射方向的要求是由光源指向交点处，因此我们需要对`lightDirWS`取反再传给`reflec`函数。然后，我们通过`_WorldSpaceCameraPos`得到了世界空间中的摄像机位置，再把顶点位置从模型空间变换到世界空间下，再通过和`_WorldSpaceCameraPos`相减得到世界空间下的视角方向。

由此，我们得到了所有的4个参数，代入公式即可得到高光反射的光照部分。

```shaderlab
Shader "Unlit/SpecularVertex"
{
    Properties
    {
        _Diffuse ("Diffuse", color) = (1.0, 1.0, 1.0, 1.0)
        _Specular ("Specular", color) = (1.0, 1.0, 1.0, 1.0)
        _Smoothness ("Smoothness", Range(8.0, 256)) = 20
    }
    SubShader
    {
        Tags { "RenderPipeline" = "UniversalPipeline" }

        Pass
        {
            Tags { "LightMode" = "UniversalForward" }

            HLSLPROGRAM
            #pragma vertex vert
            #pragma fragment frag

            #include "Packages/com.unity.render-pipelines.universal/ShaderLibrary/Core.hlsl"
            #include "Packages/com.unity.render-pipelines.universal/ShaderLibrary/Lighting.hlsl"

            CBUFFER_START(UnityPerMaterial)
            half4 _Diffuse;
            half4 _Specular;
            float _Smoothness;
            CBUFFER_END

            struct Attributes
            { 
                float4 positionOS : POSITION;
                float3 normalOS : NORMAL;
            };

            struct Varyings
            {
                float4 positionHCS : SV_POSITION;
                half3 color : TEXCOORD0;
            };

            Varyings vert(Attributes IN)
            {
                Varyings OUT;
                OUT.positionHCS = TransformObjectToHClip(IN.positionOS.xyz);
                Light mainLight = GetMainLight();
                half3 normalWS = normalize(TransformObjectToWorldNormal(IN.normalOS));
                half3 lightDirWS = mainLight.direction;
                half3 ambient = SampleSH(normalWS);
                half3 diffuse = mainLight.color.rgb * _Diffuse.rgb * saturate(dot(normalWS, lightDirWS));

                half3 reflectDir = normalize(reflect(-lightDirWS, normalWS));

                float3 positionWS = TransformObjectToWorld(IN.positionOS.xyz);
                half3 viewDirWS = normalize(_WorldSpaceCameraPos.xyz - positionWS);
                
                half3 specular = mainLight.color * _Specular.rgb * pow(saturate(dot(reflectDir, viewDirWS)), _Smoothness);
                
                OUT.color = ambient + diffuse + specular;
                return OUT;
             }
             half4 frag(Varyings IN) : SV_Target   
             {
                return half4(IN.color, 1.0);
             }

            ENDHLSL
        }
    }
    Fallback "Universal Render Pipeline/Simple Lit"
}

```

<!-- 这是一张图片，ocr 内容为： -->
![URP效果](https://cdn.nlark.com/yuque/0/2026/png/61442912/1777367884098-1fca0669-2361-4c4b-a50a-d2f4f9c9c497.png)

使用逐顶点的方法得到的高光效果有比较大的问题，我们可以从图中看出，高光部分明显不平滑，这主要是因为，高光反射部分的计算是非线性的，而在顶点着色器中计算光照再进行插值的过程是线性的，破坏了原计算的非线性关系，就会出现较大的视觉问题。因此，我们就需要使用逐像素的方法来计算。

### 实践：逐像素高光反射
比起逐顶点的方式，逐像素方式就是把计算过程放在了片元着色器，我们在顶点着色器中把片元着色器需要的世界空间下的法线和顶点坐标传过去，其他的部分与逐顶点方式一样。

```shaderlab
struct Attributes
{ 
    float4 positionOS : POSITION;
    float3 normalOS : NORMAL;
};

struct Varyings
{
    float4 positionHCS : SV_POSITION;
    float3 normalWS : TEXCOORD0;
    float3 positionWS : TEXCOORD1;
};
```

在定义输出结构体的时候多了一个positionWS，用于传世界空间下的顶点坐标。	

```shaderlab
half4 frag(Varyings IN) : SV_Target   
{
    Light mainLight = GetMainLight();
    half3 normalWS = normalize(IN.normalWS);
    half3 lightDirWS = mainLight.direction;
    half3 ambient = SampleSH(normalWS);
    half3 diffuse = mainLight.color * _Diffuse.rgb * saturate(dot(normalWS, lightDirWS));

    half3 reflectDir = normalize(reflect(-lightDirWS, normalWS));

    half3 viewDirWS = GetWorldSpaceNormalizeViewDir(IN.positionWS);
    half3 specular = mainLight.color * _Specular.rgb * pow(saturate(dot(reflectDir, viewDirWS)), _Smoothness);

    half3 color = ambient + diffuse + specular;
    return half4(color, 1.0);
}
```

:::info
需要注意的是，这里没有使用`normalize(_WorldSpaceCameraPos.xyz - positionWS)`，而是使用了URP的一个新的内置方法`GetWorldSpaceNormalizeViewDir(i.positionWS)`，专门计算世界空间下标准化后的视角方向。

:::

直接见完整代码：

```shaderlab
Shader "Unlit/SpecularPixel"
{
    Properties
    {
        _Diffuse ("Diffuse", color) = (1.0, 1.0, 1.0, 1.0)
        _Specular ("Specular", color) = (1.0, 1.0, 1.0, 1.0)
        _Smoothness ("Smoothness", Range(8.0, 256)) = 20
    }
    SubShader
    {
        Tags { "RenderPipeline" = "UniversalPipeline" }

        Pass
        {
            Tags { "LightMode" = "UniversalForward" }

            HLSLPROGRAM
            #pragma vertex vert
            #pragma fragment frag

            #include "Packages/com.unity.render-pipelines.universal/ShaderLibrary/Core.hlsl"
            #include "Packages/com.unity.render-pipelines.universal/ShaderLibrary/Lighting.hlsl"

            CBUFFER_START(UnityPerMaterial)
            half4 _Diffuse;
            half4 _Specular;
            float _Smoothness;
            CBUFFER_END

            struct Attributes
            { 
                float4 positionOS : POSITION;
                float3 normalOS : NORMAL;
            };

            struct Varyings
            {
                float4 positionHCS : SV_POSITION;
                float3 normalWS : TEXCOORD0;
                float3 positionWS : TEXCOORD1;
            };

            Varyings vert(Attributes IN)
            {
                Varyings OUT;
                OUT.positionHCS = TransformObjectToHClip(IN.positionOS.xyz);
                OUT.normalWS = TransformObjectToWorldNormal(IN.normalOS);
                OUT.positionWS = TransformObjectToWorld(IN.positionOS.xyz);
                return OUT;
             }
            half4 frag(Varyings IN) : SV_Target   
             {
                Light mainLight = GetMainLight();
                half3 normalWS = normalize(IN.normalWS);
                half3 lightDirWS = mainLight.direction;
                half3 ambient = SampleSH(normalWS);
                half3 diffuse = mainLight.color * _Diffuse.rgb * saturate(dot(normalWS, lightDirWS));

                half3 reflectDir = normalize(reflect(-lightDirWS, normalWS));
                 
                half3 viewDirWS = GetWorldSpaceNormalizeViewDir(IN.positionWS);
                half3 specular = mainLight.color * _Specular.rgb * pow(saturate(dot(reflectDir, viewDirWS)), _Smoothness);
                
                half3 finalColor = ambient + diffuse + specular;
                return half4(finalColor, 1.0);
             }

            ENDHLSL
        }
    }
    Fallback "Universal Render Pipeline/Simple Lit"
}
```

<!-- 这是一张图片，ocr 内容为： -->
![URP效果](https://cdn.nlark.com/yuque/0/2026/png/61442912/1777368660080-d3b3aba6-7d64-42c9-904e-00b0ac6bc040.png)

可以看出，按逐像素的方式处理光照可以得到更加平滑的高光效果，至此我们就实现了一个完整的Phong光照模型。

### Blinn-Phong光照模型
和上述的Phong模型相比，Blinn提出了一个简单的修改方法来得到类似的效果。它的基本思想是，避免计算反射方向 $\hat{r}$。为此，Blinn模型引入了一个新矢量 $\hat{h}$，它是通过对 $\hat{v}$ 和 $\hat{l}$ 的取平均后再归一化得到的，即：

$\hat{h}=\frac{\hat{v}+\hat{l}}{|\hat{v}+\hat{l}|}$

然后，使用$\hat{n}$和$\hat{h}$之间的夹角进行计算，而非$\hat{v}$和$\hat{r}$之间的夹角，如下图

<!-- 这是一张图片，ocr 内容为： -->
![Blinn模型](https://cdn.nlark.com/yuque/0/2026/png/61442912/1777396811913-9b5efcdb-d772-4915-b86a-4aa00b95effa.png)

总结一下，Blinn模型的公式如下：

$c_{specular}=(c_{light}·m_{specular})max(0,\hat{n}·\hat{h})^{m_{smoothness}}$

在硬件实现时，如果摄像机和光源距离模型足够远的话，Blinn模型会快于Phong模型，这是因为，此时可以任务$\hat{v}$和$\hat{l}$都是定值，因此$\hat{h}$将是一个常量。但是当$\hat{v}$和$\hat{l}$不是定值时，Phong模型反而会快一些。需要注意的是，这两种光照模型都是经验模型，也就是说，我们不应该认为Blinn模型是对“正确的”Phong模型的近似。实际上，在一些情况下，Blinn模型更符合实验结果。

Blinn模型的实现也很简单，只需要在上一节的基础上，修改片元着色器中高光反射的部分：

```shaderlab
half4 frag(Varyings IN) : SV_Target   
{
    Light mainLight = GetMainLight();
    half3 normalWS = normalize(IN.normalWS);
    half3 lightDirWS = mainLight.direction;
    half3 ambient = SampleSH(normalWS);

    // 优化：把NdotL单独拿出来
    half lambert = saturate(dot(normalWS, lightDirWS));
    half3 diffuse = mainLight.color * _Diffuse.rgb * lambert;

    half3 viewDirWS = GetWorldSpaceNormalizeViewDir(IN.positionWS);

    // 添加了h矢量
    half3 halfDirWS = normalize(viewDirWS + lightDirWS);
    // // 换成了法线点乘h
    half3 specular = mainLight.color * _Specular.rgb * pow(saturate(dot(normalWS, halfDirWS)), _Smoothness);

    half3 finalColor = ambient + diffuse + specular;
    return half4(finalColor, 1.0);
}
```

以下是完整代码：

```shaderlab
Shader "Unlit/BlinnPhong"
{
    Properties
    {
        _Diffuse ("Diffuse", color) = (1.0, 1.0, 1.0, 1.0)
        _Specular ("Specular", color) = (1.0, 1.0, 1.0, 1.0)
        _Smoothness ("Smoothness", Range(8.0, 256)) = 20
    }
    SubShader
    {
        Tags { "RenderPipeline" = "UniversalPipeline" }

        Pass
        {
            Tags { "LightMode" = "UniversalForward" }

            HLSLPROGRAM
            #pragma vertex vert
            #pragma fragment frag

            #include "Packages/com.unity.render-pipelines.universal/ShaderLibrary/Core.hlsl"
            #include "Packages/com.unity.render-pipelines.universal/ShaderLibrary/Lighting.hlsl"

            CBUFFER_START(UnityPerMaterial)
            half4 _Diffuse;
            half4 _Specular;
            float _Smoothness;
            CBUFFER_END

            struct Attributes
            { 
                float4 positionOS : POSITION;
                float3 normalOS : NORMAL;
            };

            struct Varyings
            {
                float4 positionHCS : SV_POSITION;
                float3 normalWS : TEXCOORD0;
                float3 positionWS : TEXCOORD1;
            };

            Varyings vert(Attributes IN)
            {
                Varyings OUT;
                OUT.positionHCS = TransformObjectToHClip(IN.positionOS.xyz);
                OUT.normalWS = TransformObjectToWorldNormal(IN.normalOS);
                OUT.positionWS = TransformObjectToWorld(IN.positionOS.xyz);
                return OUT;
            }
            half4 frag(Varyings IN) : SV_Target   
            {
                Light mainLight = GetMainLight();
                half3 normalWS = normalize(IN.normalWS);
                half3 lightDirWS = mainLight.direction;
                half3 ambient = SampleSH(normalWS);
    
                // 优化：把NdotL单独拿出来
                half lambert = saturate(dot(normalWS, lightDirWS));
                half3 diffuse = mainLight.color * _Diffuse.rgb * lambert;

                half3 viewDirWS = GetWorldSpaceNormalizeViewDir(IN.positionWS);
                
                // 添加了h矢量
                half3 halfDirWS = normalize(viewDirWS + lightDirWS);
                // // 换成了法线点乘h
                half3 specular = mainLight.color * _Specular.rgb * pow(saturate(dot(normalWS, halfDirWS)), _Smoothness);
                
                half3 finalColor = ambient + diffuse + specular;
                return half4(finalColor, 1.0);
            }

            ENDHLSL
        }
    }
    Fallback "Universal Render Pipeline/Simple Lit"
}
```

<!-- 这是一张图片，ocr 内容为： -->
![URP效果](https://cdn.nlark.com/yuque/0/2026/png/61442912/1777397504763-5f89deb3-cac2-4bdd-b741-bf14edd85029.png)

下图给出，逐顶点的高光反射、逐像素的高光反射（Phong模型）和Blinn-Phong高光反射光照的效果对比

<!-- 这是一张图片，ocr 内容为： -->
![三种高光效果对比](https://cdn.nlark.com/yuque/0/2026/png/61442912/1777397837348-14b4534a-08f4-46af-8d3d-bb31fb64f7cf.png)

可以看出，Blinn-Phong光照模型的高光反射部分看起来更大、更亮一些。在实际渲染中，绝大多数清空我们都会选择Blinn-Phong光照模型。需要再次提醒的是，这两种光照模型都是经验模型，不存在谁对谁错，只是在一些情况下（详见18章-基于物理的渲染），Blinn-Phong模型更符合实验结果。

在这里要提一个可选的小优化方案，在我们实现的这个高光反射方案中，可能会发现，当我们隔着物体完全挡住光源看向物体的时候，发现也会有高光的显示，如果我们不像让它在这种情况下显示高光，可以在计算高光的时候再乘上一个兰伯特系数。

```shaderlab
half3 specular = mainLight.color * _Specular.rgb * pow(saturate(dot(normalWS, halfDirWS)), _Smoothness) * lambert;
```

