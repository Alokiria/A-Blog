---
title: '第七章 基础纹理'
date: 2026-10-01
updated: 2026-10-05
categories: UnityShader入门精要-URP改编
cover: https://img2024.cnblogs.com/blog/3739951/202610/3739951-20261001183332881-544713617.png
tags:
  - Shaderlab
  - TA
  - 图形学
top: 1
---

纹理最粗和的目的就是使用一张图片来控制模型的外观。使用**纹理映射（texture mapping）技术**，我们可以把一张图“黏”在模型表面，逐**纹素（texel）**（纹素的名字是为了和像素进行区分）地控制模型的颜色。

在美术人员建模时候，通常会在建模软件中利用纹理展开技术把**纹理映射坐标（texture-mapping coordinates）** 存储在每个顶点上。纹理映射坐标定义了该顶点在纹理中对应的2D坐标。通常，这些坐标使用一个二位变量`（u，v）`来表示，其中u是横向坐标，而v是纵向坐标。因此纹理映射坐标也被称为UV坐标。

尽管纹理的大小可以是多种多样，例如可以是256x256或者1024x1024，但顶点UV坐标的范围通常都被归一化到[0, 1]范围内。需要注意的是，纹理采样时使用的纹理坐标不一定是在[0, 1]范围内。实际上，这种不在范围内的纹理坐标有时非常有用。与之关心紧密的是纹理的平铺模式，他将决定渲染引擎在遇到不在[0, 1]范围内的纹理坐标时，如何进行纹理采样。

在OpenGL中，纹理空间的原点位于左下角，而DirectX中，原点位于左上角，幸运的是，Unity在绝大多数情况下为我们处理好了这个差异问题（特例是只有在启用了抗锯齿，并在这时使用了渲染到纹理技术）。即便游戏的目标平台可能既有OpenGL风格，也有DirectX风格，但我们在Unity中使用的通常只有一种坐标系，Unity使用的纹理空间是符合OpenGL的传统的，也就是说原点在纹理左下角。

需要提醒的是，本章着重讲述纹理采样的原理，因此实现的Shader往往并不能直接应用到实际项目中（直接使用的话会缺少阴影、光照衰减等）。

# 单张纹理
在本例中，我们仍然使用Blinn-Phong光照模型来计算光照。

首先第一步，为了使用纹理，我们需要在Properties语义块中添加一个纹理属性：

```shaderlab
Properties
{
    _Color ("Color", Color) = (1, 1, 1, 1)
    _BaseMap ("Base Map", 2D) = "white" {}
    _Specular ("Specular", Color) = (1, 1, 1, 1)
    _Smoothness ("Smoothness", Range(8.0, 256)) = 20
}
```

上面代码声明了一个名为`_BaseMap`的纹理，2D是纹理属性的声明方式。我们使用一个字符串后跟一个花括号作为它的初始值，“white”是内置纹理的名字，也就是一个全白的纹理。为了控制物体的整体色调，我们还声明了一个`_Color`属性。我们这里没有了`_Diffuse`属性，是因为我将使用纹理的颜色来代替原有的黑白颜色。

我们需要在Pass中声明和上述属性类型相匹配的变量，以便和材质面板中的属性建立联系：

```shaderlab
// 下面两个可以换成sampler2D _BaseMap;
// 但是最好用下面的写法，把材质和采样器分离
TEXTURE2D(_BaseMap);
SAMPLER(sampler_BaseMap);

CBUFFER_START(UnityPerMaterial)
float4 _BaseMap_ST;
half4 _Color;
half4 _Specular;
float _Smoothness;
CBUFFER_END
```

与其他属性不同，我们还需要为纹理类型的属性声明一个float4类型的变量`_BaseMap_ST`。其中`_BaseMap_ST`的名字不是任意起的。在Unity中，我们需要使用 `纹理名_ST` 的方式来声明某个纹理的属性。其中，ST是缩放（scale）和平移（translation）的缩写，使用`_BaseMap_ST`可以让我们得到该纹理的缩放和平移（偏移）值，`_BaseMap_ST.xy`存储的是缩放值，而`_BaseMap_ST.zw`存储的是偏移值，这些值都可以在材质面板中调节。需要注意的是，这里的材质采样部分不需要写入UnityPerMaterial中，里面只需要写一些材质参数

<!-- 这是一张图片，ocr 内容为： -->
![MainTex可调节属性](https://cdn.nlark.com/yuque/0/2026/png/61442912/1777485581073-939cfb2d-612f-4ae4-a014-44b094d98f67.png)

接下来需要定义顶点着色器的输入输出结构体：

```shaderlab
struct Attributes
{ 
    float4 positionOS : POSITION;
    float3 normalOS : NORMAL;
    float4 uv0 : TEXCOORD0;
};

struct Varyings
{
    float4 positionHCS : SV_POSITION;
    float3 normalWS : TEXCOORD0;
    float3 positionWS : TEXCOORD1;
    float2 uv0 : TEXCOORD2;
};
```

我们首先在输入结构体中使用TEXCOORD0语义声明了一个新变量`uv0`，这样Unity就会把模型的第一组纹理坐标存储到该变量中，然后我们在输出结构体中声明`uv0`用于存储纹理坐标，以便在片元着色器中使用该坐标进行纹理采样。

然后我们定义顶点着色器：

```shaderlab
Varyings vert(Attributes IN)
{
    Varyings OUT;
    OUT.positionHCS = TransformObjectToHClip(IN.positionOS.xyz);
    OUT.normalWS = TransformObjectToWorldNormal(IN.normalOS);
    OUT.positionWS = TransformObjectToWorld(IN.positionOS.xyz);
    // o.uv0 = v.uv0.xy * _MainTex_ST.xy + _MainTex_ST.zw;
    OUT.uv0 = TRANSFORM_TEX(IN.uv0, _BaseMap);
    return OUT;
}
```

在顶点着色器中，我们使用纹理的属性值`_BaseMap_ST`来对顶点纹理坐标进行变换，得到最终的纹理坐标。计算过程是：首先使用`_BaseMap_ST.xy`对顶点纹理坐标进行缩放，然后再使用`_BaseMap_ST.zw`对结果进行偏移。Unity提供了一个内置宏`TRANSFORM_TEX`来帮我们计算上述过程。

```shaderlab
#define TRANSFORM_TEX(tex,name) (tex.xy * name##_ST.xy + name##_ST.ze)
```

它接收两个参数，第一个参数是顶点纹理坐标，第二个参数是纹理名，在它的实现中，将利用`纹理名_ST`的方式来计算变换后的纹理坐标。

最后，我们还需要实现片元着色器，并在计算漫反射时使用纹理中的纹素值：

```shaderlab
half4 frag(Varyings IN) : SV_Target   
{
    Light mainLight = GetMainLight();
    half3 normalWS = normalize(IN.normalWS);
    half3 lightDirWS = mainLight.direction;

    half3 albedo = SAMPLE_TEXTURE2D(_BaseMap, sampler_BaseMap, IN.uv0).rgb * _Color.rgb;
    half3 ambient = SampleSH(normalWS) * albedo;
    half lambert = saturate(dot(normalWS, lightDirWS));
    half3 diffuse = mainLight.color * albedo * lambert;

    half3 viewDirWS = GetWorldSpaceNormalizeViewDir(IN.positionWS);
    half3 halfDirWS = normalize(viewDirWS + lightDirWS);
    half3 specular = mainLight.color * _Specular.rgb * pow(saturate(dot(normalWS, halfDirWS)), _Smoothness);

    half3 finalColor = ambient + diffuse + specular;
    return half4(finalColor, 1.0);   
}
```

上面代码首先计算了世界空间下的法线方向和光照方向。然后，使用了URP的`SAMPLE_TEXTURE2D`函数对纹理进行采样。它的第一个参数是需要被采样的纹理；第二个参数是对应是采样状态，也就是一个采样器；第三个参数是一个float2类型是纹理坐标，他将返回计算得到的纹素值。我们使用采样结果和颜色属性`_Color`的乘积来作为材质的反射率`albedo`，并把它和环境光照相乘得到环境光部分。随后我们使用`albedo`来计算漫反射光照的结果，并和环境光照、高光反射光照相加后返回。

我们使用书中的`Brick_Diffuse.jpg`纹理对Base Map属性进行赋值。

完整代码：

```shaderlab
Shader "Unlit/SingleTexture"
{
    Properties
    {
        _Color ("Color", Color) = (1, 1, 1, 1)
        _BaseMap ("Base Map", 2D) = "white" {}
        _Specular ("Specular", Color) = (1, 1, 1, 1)
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

            TEXTURE2D(_BaseMap);
            SAMPLER(sampler_BaseMap);
            
            CBUFFER_START(UnityPerMaterial)
            float4 _BaseMap_ST;
            half4 _Color;
            half4 _Specular;
            float _Smoothness;
            CBUFFER_END

            struct Attributes
            { 
                float4 positionOS : POSITION;
                float3 normalOS : NORMAL;
                float4 uv0 : TEXCOORD0;
            };

            struct Varyings
            {
                float4 positionHCS : SV_POSITION;
                float3 normalWS : TEXCOORD0;
                float3 positionWS : TEXCOORD1;
                float2 uv0 : TEXCOORD2;
            };
            Varyings vert(Attributes IN)
            {
                Varyings OUT;
                OUT.positionHCS = TransformObjectToHClip(IN.positionOS.xyz);
                OUT.normalWS = TransformObjectToWorldNormal(IN.normalOS);
                OUT.positionWS = TransformObjectToWorld(IN.positionOS.xyz);
                OUT.uv0 = TRANSFORM_TEX(IN.uv0, _BaseMap);
                return OUT;
            }
            half4 frag(Varyings IN) : SV_Target   
            {
                Light mainLight = GetMainLight();
                half3 normalWS = normalize(IN.normalWS);
                half3 lightDirWS = mainLight.direction;

                half3 albedo = SAMPLE_TEXTURE2D(_BaseMap, sampler_BaseMap, IN.uv0).rgb * _Color.rgb;
                half3 ambient = SampleSH(normalWS) * albedo;
                half3 diffuse = mainLight.color * albedo * saturate(dot(normalWS, lightDirWS));

                half3 viewDirWS = GetWorldSpaceNormalizeViewDir(IN.positionWS);
                half3 halfDirWS = normalize(viewDirWS + lightDirWS);
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
![URP效果](https://cdn.nlark.com/yuque/0/2026/png/61442912/1777485545156-ba28be19-6348-4c91-aefe-55a3b2f9d273.png)

# 纹理的属性
在我们向Unity导入一张纹理资源后，可以在它的材质面板上调整其属性，如下图：

<!-- 这是一张图片，ocr 内容为： -->
![材质属性](https://cdn.nlark.com/yuque/0/2026/png/61442912/1777486512139-75a1c93f-289c-40f6-9cd1-0711a3c61cce.png)

材质面板的第一个属性是纹理类型。在上一节中，我们使用的是 Default 默认类型，也就是原来的 Texture 类型，在下面的法线纹理一节，我们会使用 Normal map 类型。而在后面的章节中，我们还会看到 Cubemap 等高级纹理类型。我们之所以要为导入的纹理选择合适的类型，是因为只有这样才能让Unity知道我们的意图，为Unity Shader传递正确的纹理，并在一些情况下可以让Unity对该纹理进行优化。

把纹理设置成 Default 后，下面会有一个 Alpha Source 下拉菜单：

<!-- 这是一张图片，ocr 内容为： -->
![](https://cdn.nlark.com/yuque/0/2026/png/61442912/1777486949384-438ef014-56c0-4adc-8b09-82dd86795d30.png)

如果选择了 From Fray Scale，那么透明通道的值将会由每个像素的灰度值生成。关于透明度，我们会在第八章中讲到，在这里不要选它。

默认选择的 Input Texture Alpha 就是说使用纹理自带的Alpha通道，None就是不生成Alpha。

下面有个属性很重要，Wrap Mode。它决定了当纹理坐标超过[0, 1]范围后将会如何平铺。

<!-- 这是一张图片，ocr 内容为： -->
![](https://cdn.nlark.com/yuque/0/2026/png/61442912/1778655713413-61764f02-dc9c-45e0-9d8d-385b80aa264f.png)

Wrap Mode有四种模式：

一种是`Repeat`，在这种模式下，如果纹理坐标超过了 1，那么它整数部分将会被舍弃，而直接使用小数部分进行采样，这样的结果是纹理将会不断重复；

<!-- 这是一张图片，ocr 内容为： -->
![平铺（Tiling）属性为(3, 3)时效果](https://cdn.nlark.com/yuque/0/2026/png/61442912/1778655877375-abcf6e25-684b-4e64-98bd-673d2f10a8a6.png)

一种是`Clamp`，在这种模式下，如果纹理坐标大于 1，那么将会截取到 1，如果小于 0，那么将会截取到 0。

<!-- 这是一张图片，ocr 内容为： -->
![平铺（Tiling）属性为(3, 3)时效果](https://cdn.nlark.com/yuque/0/2026/png/61442912/1778655955928-0db2d604-d908-42b3-b0ba-fcfd0f3f64e1.png)

一种是`Mirror`，在这种模式下，纹理坐标将会是 1 -（小数部分），比如1.8会被是为0.2，2.3会被视为0.7，纹理就会像镜子，在每个整数边界处翻转再重复，形成无缝的对称图形。

<!-- 这是一张图片，ocr 内容为： -->
![平铺（Tiling）属性为(3, 3)时效果](https://cdn.nlark.com/yuque/0/2026/png/61442912/1778656004733-7af33e04-f82a-4db4-b12a-9353ca47772d.png)

一种是`Mirror Once`，在这种模式下， 纹理先镜像一次，超出 ±1 范围后就切换为`<font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">Clamp</font>`模式 

<!-- 这是一张图片，ocr 内容为： -->
![平铺（Tiling）属性为(3, 3)，偏移（Offset）为(-1.5, -1.5)](https://cdn.nlark.com/yuque/0/2026/png/61442912/1778656078563-f298e3dd-62ab-4241-8bbf-d55e365f35d3.png)

纹理导入面板中的下一个属性是Filter Mode属性，它决定了当纹理由于变换而产生拉伸时将会采用哪种滤波模式。Filter Mode支持 3 种模式，Point，Bilinear，Trilinear。它们得到的图片滤波效果依次提升，但需要耗费的性能也依次增大。纹理滤波会影响放大或缩小时得到的图片质量。

<!-- 这是一张图片，ocr 内容为： -->
![Filter Mode：Point](https://cdn.nlark.com/yuque/0/2026/png/61442912/1778656800673-d5a0c9d7-1a5d-4b6f-af75-b621893fdb8e.png)

<!-- 这是一张图片，ocr 内容为： -->
![Filter Mode：Bilinear](https://cdn.nlark.com/yuque/0/2026/png/61442912/1778656838466-9e5e15d1-b30b-48f1-92b3-3db941efbde6.png)

<!-- 这是一张图片，ocr 内容为： -->
![Filter Mode：Trilinear](https://cdn.nlark.com/yuque/0/2026/png/61442912/1778656869217-3a3d5e9d-c0ba-4e05-ab7e-c20d7cb86f58.png)

在内部实现上，Point 模式使用了最近邻（nearest neighbor）滤波，在放大或缩小时，它的采样像素数目通常只有一个，因此图像会看起来有种像素风格的效果。而 Bilinear 滤波则使用了线性滤波，对于每个目标像素，他会找到4个临近像素，然后对它们进行线性插值混合后得到最终像素，因此图像看起来像被模糊了。而 Trilinear 滤波几乎是和 Bilinear 一样的，只是 Trilinear 还会在多级渐远纹理之间进行混合，也就是在相邻的 Mipmap 中进行线性插值。如果一张纹理没有使用多级渐远纹理技术，那么 Trilinear 得到的结果是和 Bilinear 就一样的。通常我们会选择 Bilinear 模式。需要注意的是，如果不需要纹理变得模糊，例如像素风，这时候我们会选择 Point 模式

纹理缩小的过程比放大更加复杂一些，此时纹理中的多个像素将会对应一个目标像素。纹理缩小更加复杂的原因在于我们往往需要处理锯齿问题，一个最常使用的方法就是使用**多级渐远纹理（mipmapping）技术**，其中“mip”是拉丁文“multum in parvo”的缩写，它的意思是在一个小空间里有许多东西。多级渐远纹理技术将原纹理提前用滤波处理来得到很多更小的图像，形成一个图像金字塔，每一层都是对上一层图像降采样的结果。这样在实时运行的时候，就可以快速得到结果像素，例如当物体远离摄像机的时候，可以直接使用较小的纹理。但缺点是需要使用一定的空间用于存储这些多级渐远纹理，通常会多 33% 的内存空间，典型的用空间换时间的方法。

在材质面板中，勾选 Advanced 下的 Generate Mip Maps 即可开启多级渐远纹理，为该纹理创建 Mip Maps。

<!-- 这是一张图片，ocr 内容为： -->
![开启Mipmapping](https://cdn.nlark.com/yuque/0/2026/png/61442912/1778657787685-aad9536e-57ae-4951-9d7d-3a52db3f4a76.png)

下图图一是在Point滤波下的，会发现在远处的网格发生了断裂，而且有很多的锯齿，这种在采样率低的情况下就会发生，图二是在512x超采样的情况下的图，效果好了不少。

<!-- 这是一张图片，ocr 内容为： -->
![这是图一](https://cdn.nlark.com/yuque/0/2026/png/61442912/1779084816622-5bd31592-f7dc-4d10-833b-66fd064f9335.png)<!-- 这是一张图片，ocr 内容为： -->
![这是图二，512x超采样](https://cdn.nlark.com/yuque/0/2026/png/61442912/1779084914510-087ce29a-695d-4d61-bd70-8e2accc0e528.png)

但是呢，512x超采样情况下，计算量反了25万倍，这不是我们想要的，这时候就可以使用**多级渐远纹理**技术和Bilinear或Trilinear滤波，效果如下图<!-- 这是一张图片，ocr 内容为： -->
![好了不少](https://cdn.nlark.com/yuque/0/2026/png/61442912/1779085067662-d9b8e0ac-2148-48e6-b3ff-f24077f96202.png)

我们发现效果好了不少，但是在远处的线条糊在了一起，发生了过曝现象，怎么办呢，这时候我们引入一个新的技术：**各向异性过滤Mipmap**。

<font style="color:rgb(25, 27, 31);">产生这种现象的原因是因为，所采用的不同等级的Mipmap默认的都是正方形区域的，然而真实情况并不是如此</font>

<!-- 这是一张图片，ocr 内容为： -->
![](https://cdn.nlark.com/yuque/0/2026/png/61442912/1779085245312-34814672-fc04-4e6d-be4f-65e8e0227359.png)  
 这里可以看出，在不同屏幕空间位置的像素点所对应的区域是不同的，有长方形，或者不规则图形。<font style="color:rgb(25, 27, 31);">针对这种情况，有的所需要的是仅仅是水平方向的，有的需要的仅仅是竖直方向上的，因此这也就启发了各向异性的过滤</font><!-- 这是一张图片，ocr 内容为： -->
![各向异性过滤Mipmap](https://cdn.nlark.com/yuque/0/2026/png/61442912/1779085356169-a245a2a4-26e9-4aec-8c11-58a095e731bd.png)

如下图，在加入各向异性过滤后，效果已经达到了预期。

<!-- 这是一张图片，ocr 内容为： -->
![各向异性过滤Mipmap+Trilinear滤波](https://cdn.nlark.com/yuque/0/2026/png/61442912/1779085382882-75a526e1-c78a-4087-b893-4f40adc8fe08.png)

在Unity中，通过修改Aniso Level来修改各向异性过滤的效果等级，前提是需要启用Generate Mipmaps以及把滤波模式改为Bilinear或者Trilinear。

<!-- 这是一张图片，ocr 内容为： -->
![各向异性过滤等级](https://cdn.nlark.com/yuque/0/2026/png/61442912/1779085555572-9e9ca29d-8d99-455d-b17e-8f212487271c.png)

最后，我们来讲一下纹理的最大尺寸和纹理模式。当我们在为不同平台发布游戏的时候，需要考虑目标平台的纹理尺寸和质量问题。Unity允许我们为不同目标平台选择不同的分辨率。

<!-- 这是一张图片，ocr 内容为： -->
![](https://cdn.nlark.com/yuque/0/2026/png/61442912/1779086541770-32a27134-019e-4e1c-a697-f39ad7cd6c3f.png)

如果导入的纹理大小超过了Max Texture Size中的设置值，那么Unity将会把该纹理缩放为这个最大分辨率。理想情况下导入的纹理可以是非正方形的，但长宽的大小应该是 2 的幂，例如2、4、8、16、32等。如果使用了非2幂大小（Non Power of Two， NPOT）的纹理，那么这些纹理会往往占用更多的内存空间，而且GPU读取该纹理的速度也会有所下降。处于性能和空间的考虑，我们应该尽量使用 2 的幂大小的纹理。

而Format决定了Unity内部使用哪种格式来存储该纹理，这里不再依次介绍了。

# 凹凸映射
纹理的另一种常见的应用就是**凹凸映射（bump mapping）**，凹凸映射的目的是使用一张纹理来修改模型表面的法线，以便为模型提供更多的细节。这种方式不会真的改变模型的顶点位置，只是让模型看起来好像是“凹凸不平”的，但可以从模型的轮廓处看出“破绽”。

有两种主要的方式可以用来进行凹凸映射：一种方法是使用一张**高度纹理（height map）**来模拟**表面位移（displacement）**，然后得到一个修改后的法线值，这种方法也被称为**高度映射（height mapping）**；另一种方法则是使用一张**法线纹理（normal map）**来直接存储表面法线，这种方法又被称为**法线映射（normal mapping**）。尽管我们常常将凹凸映射和法线映射当成是相同的技术。

## 高度纹理
使用一张高度图来实现凹凸映射，高度图中存储的是强度值（intensity），它用于表示模型表面局部的海拔高度。因此，颜色越浅表明该位置的表面越向外凸起，而颜色越深则表明该位置向里凹。这种方法的好处就是很直观，我们从高度图中明确的知道模型表面的凹凸情况。但缺点是计算更加复杂，在实时计算的时候不能直接得到表面法线，而是需要由像素的灰度值计算而得，因此需要消耗更多的性能。

# 法线纹理
法线纹理中存储的就是表面的法线方向，由于法线方向的分量是在[-1, 1]，而像素的分量为[0, 1]，因此我们首先需要做一个映射，通常使用的映射就是：

$$pixel = \frac{normal + 1}2$$

这就要求，我们在Shader中对法线纹理进行纹理采样后，还需要对结果进行一次反映射的过程，以得到原先的法线方向，反映射的过程实际就是使用上面的映射函数的逆函数：

$$normal=pixel×2-1$$

向量的计算是要看坐标空间的，那么法线纹理中存储的法线方向应该是什么坐标空间呢？对于模型顶点自带的法线，它们是定义在模型空间中的，因此一种直接的想法就是将修改后的模型空间中的表面法线存储在一张纹理中，这种纹理被称为是模型空间的法线纹理(object-space normal map)。然而，在实际制作中，我们往往会采用另一种坐标空间，即模型顶点的切线空间(tangent space)来存储法线。对于模型的每个顶点，它都有一个属于自己的切线空间，这个切线空间的原点就是这个顶点本身，而$z$轴是顶点的法线方向($n$)，$x$轴是顶点的切线方向($t$)，而$y$轴可由法线和切线叉积而得，也被称为副切线(bitangent，$b$)，这种纹理被称为切线空间的法线纹理(tangent-space normal map)。

<!-- 这是一张图片，ocr 内容为： -->
![模型空间（左）切线空间（右）](https://cdn.nlark.com/yuque/0/2026/png/61442912/1779171044264-45e40102-cb67-49a9-aed0-f471b663a86f.png)

上图中，左边的是模型空间下的法线纹理，右边是切线空间小的法线纹理，可以看出模型空间下的法线纹理是五颜六色的。这是因为所有法线所在的坐标空间是同一个坐标空间，即模型空间，而每个点所存储的法线方向是各异的，有的是(0, 1, 0)，经过映射后存储到纹理中就对应了RGB(0.5, 1, 0.5)浅绿色，有的是(0, -1, 0），经过映射后存储到纹理中就对应了RGB(0.5, 0, 0.5)紫色。而切线空间下的法线纹理看起来几乎全部都是浅蓝色的。这是因为，每个法线方向所在的坐标空间是不一样的，即是表面每个点各自的切线空间。这种法线纹理其实就是存储了每个点在各自的切线空间的法线扰动方向。也就是说，如果一个点的法线方向不变，那么在它的切线空间中，新的法线方向就是$z$轴方向，即值为(0, 0, 1)，经过映射后存储在纹理中就对应了RGB(0.5, 0.5, 1)浅蓝色，而这个颜色就是法线纹理中大片的蓝色，这些蓝色说明了顶点的大部分法线和模型本身的法线一样，不需要改变。

实际上，法线存储在哪个坐标系都是可以的，我们甚至可以选择存在世界空间下。但问题是，我们并不是单纯地想得到法线，后续的光照计算才是我们的目的，而选择哪个坐标意味着我们需要把不同信息转换到相应的坐标系中。

总体来说，使用模型空间来存储的优点如下：

+ 实现简单，更加直观。我们甚至都不需要模型原始的法线和切线等信息，也就是说，计算更少。生成它也非常简单，而如果要生成切线空间下的法线纹理，由于模型的切线一般是和UV方向相同，因此想要得到效果比较好的法线映射就要求纹理映射也是连续的。
+ 在纹理坐标的缝合处和尖锐的边角部分，可见的突变（缝隙）较少，即可以提供平滑的边界。这是因为模型空间下的法线纹理存储的是同一坐标系下的法线信息，因此在边界处通过插值得到的法线可以平滑变换。

但使用切线空间有更多有点：

+ 自由度很高，模型空间下的法线纹理记录的是绝对法线信息，仅可用于创建它时的那个模型，而应用到其他模型上效果就完全错误。而切线空间下的法线纹理记录的是相对法线信息，这意味着，即便把该纹理应用到一个完全不同的网格上，也可以得到一个合理的结果。
+ 可进行UV动画。比如我们可以移动一个纹理的UV坐标来实现一个凹凸移动的效果，但使用模型空间下的法线纹理会得到完全错误的结果，原因同上。
+ 可以重用法线纹理。比如，一个砖块，我们可以仅用一张纹理就可以用到所有的面。
+ 可压缩。由于切线空间下的法线纹理中的法线的$z$方向总是正方向，因此我们可以仅存储 $xy$ 方向，推导得到$z$方向。

切线空间下的法线纹理的前两个优点足以让很多人放弃模型空间下的法线纹理而选择它。

由于法线纹理中存储的法线是切线空间下的方向，因此我们通常有两种选择，一种选择是从切线空间下进行光照计算，此时我们需要把光照方向、视角方向变换到切线空间下；另一种选择是在世界空间下进行光照计算，此时我们需要把采样得到的法线方向变换到世界空间下，再和世界空间下的光照方向和视角方向进行计算。从效率上来讲，第一种方法往往优于第二种，因为可以在顶点着色器中就完成对光照方向和视角方向的变换，而第二种方法由于要对法线纹理进行采样，所以变换过程必须在片元着色器中实现，这意味着我们需要在片元着色器中进行一次矩阵操作。但从通用性角度来讲，第二种要优于第一种，因为有时我们需要在世界空间下进行一些计算，例如在使用Cubemap进行环境映射时，我们需要使用世界空间下的反射方向对Cubemap进行采样。

## 实践：在切线空间下计算
此时，我们需要把光照方向、视角方向变换到切线空间下，在切线空间下计算光照模型。我们首先需要知道从模型空间到切线空间的变换矩阵。这个变换矩阵的逆矩阵，即从切线空间到模型空间的变换矩阵是非常容易求得的，我们在顶点着色器中按切线（$x$轴），副切线（$y$轴），法线（$z$轴）的顺序按**列**排序即可得到。我们知道，如果一个变换中仅存在平移和旋转变换，那么这个变换的逆矩阵就等于它的转置矩阵，而从切线空间到模型空间的变换矩阵正是符合这样要求的变换。因此，从模型空间到切线空间的变换矩阵就是从切线空间到模型空间的变换矩阵的逆矩阵，我们把切线（$x$轴），副切线（$y$轴），法线（$z$轴）的顺序按**行**排序即可得到。

首先，我们在Properties语义块中添加了两个新属性，一个是法线纹理的属性，一个是用于控制凹凸程度的属性。

```shaderlab
Properties
{
    _Color ("Color", Color) = (1, 1, 1, 1)
    _BaseMap ("Base Map", 2D) = "white" {}
    _Specular ("Specular", Color) = (1, 1, 1, 1)
    _Smoothness ("Smoothness", Range(8.0, 256)) = 20
    _NormalMap ("Normal Map", 2D) = "bump" {}  // 法线纹理
    _NormalScale ("Normal Scale", Float) = 1.0  // 控制法线纹理
}
```

对于法线纹理，我们使用"bump"作为它的默认值，"bump"是Unity内置的法线纹理，当没有提供任何法线纹理时，"bump"就对应了模型自带的法线信息。_NormalScale则是用于控制凹凸程度的，当它为 0 时，意味着该法线纹理不会对光照产生任何影响。

然后在Pass中声明相应的属性：

```shaderlab
TEXTURE2D(_BaseMap);
SAMPLER(sampler_BaseMap);
TEXTURE2D(_NormalMap);
SAMPLER(sampler_NormalMap);

CBUFFER_START(UnityPerMaterial)
float4 _BaseMap_ST;
float4 _NormalMap_ST;
float _NormalScale;
half4 _Color;
half4 _Specular;
float _Smoothness;
CBUFFER_END
```

然后定义输入和输出结构体：

```shaderlab
struct Attributes
{
    float4 positionOS: POSITION;
    float3 normalOS: NORMAL;
    float4 tangentOS: TANGENT;
    float4 uv0: TEXCOORD0;
};

struct Varyings
{
    float4 positionHCS: SV_POSITION;
    float4 uv0: TEXCOORD0;
    float3 lightDirTS: TEXCOORD1;
    float3 viewDirTS: TEXCOORD2;
    float3 normalWS: TEXCOORD3;
};
```

我们使用了TANGENT语义来描述float4类型的tangentOS变量，以告诉Unity把顶点的切线方向填充到tangentOS变量中。需要注意的是，和法线方向normalOS不同，tangentOS的类型是float4，而非float3，这是因为我们需要使用tangent.w分量来决定切线空间中的第三个坐标轴——副切线的方向性。

然后在输出结构体中定义，传入的切线空间下的光照和视角方向。

之后我们定义顶点着色器：

```shaderlab
Varyings vert (Attributes IN)
{
    Varyings OUT;
    OUT.positionHCS = TransformObjectToHClip(IN.positionOS.xyz);
    OUT.normalWS = TransformObjectToWorldNormal(IN.normalOS);
    // OUT.uv0.xy = IN.uv0.xy * _BaseMap_ST.xy + _BaseMap_ST.zw;
    // OUT.uv0.zw = IN.uv0.xy * _NormalMap_ST.xy + _NormalMap_ST.zw;
    OUT.uv0.xy = TRANSFORM_TEX(IN.uv0, _BaseMap);
    OUT.uv0.zw = TRANSFORM_TEX(IN.uv0, _NormalMap);
    half3 binormal = cross(normalize(IN.normalOS), normalize(IN.tangentOS.xyz)) * IN.tangentOS.w;
    float3x3 rotation = float3x3(normalize(IN.tangentOS.xyz), binormal, normalize(IN.normalOS));
    Light mainLight = GetMainLight();
    half3 lightDirWS = mainLight.direction;
    half3 lightDirOS = TransformWorldToObjectDir(lightDirWS);
    OUT.lightDirTS = mul(rotation, lightDirOS);
    half3 viewDirOS = GetObjectSpaceNormalizeViewDir(IN.positionOS);
    OUT.viewDirTS = mul(rotation, viewDirOS);
    return OUT;
}
```

由于我们使用了两张纹理，因此需要存储两个纹理坐标。为此，我们把Varyings中的uv0变量的类型定义为float4类型，其中xy分量存储了_BaseMap的纹理坐标，而zw分量存储了_NormalMap的纹理坐标（实际上，_BaseMap和_NormalMap通常会使用同一组纹理坐标，出于减少插值寄存器的使用数目的目的，我们往往只计算和存储一个纹理坐标即可，也就是都用主纹理的纹理坐标）。然后我们使用法线和切线方向的叉积与IN.tangentOS.w相乘，这是因为和切线与法线方向都垂直的方向有两个，而 w 决定了我们选择其中的哪一个方向，然后我们使用切线、副切线、法线按行排列来得到从模型空间到切线空间的变换矩阵rotation。然后，我们使用mainLight.direction和TransformWorldToObjectDir来得到模型空间下的光照方向，使用GetObjectSpaceNormalizeViewDir来得到模型空间下的视角方向，再利用变换矩阵rotation把它们从模型空间变换到切线空间。

下面再提供另一种写法：

```shaderlab
Varyings vert (Attributes IN)
{
    Varyings OUT;
    OUT.positionHCS = TransformObjectToHClip(IN.positionOS.xyz);

    OUT.uv0.xy = TRANSFORM_TEX(IN.uv0, _BaseMap);
    OUT.uv0.zw = TRANSFORM_TEX(IN.uv0, _NormalMap);

    VertexNormalInputs normalInputs = GetVertexNormalInputs(IN.normalOS, IN.tangentOS);
    OUT.normalWS = normalInputs.normalWS;
    float3x3 tangentToWorld = CreateTangentToWorld(normalInputs.normalWS, normalInputs.tangentWS, IN.tangentOS.w);
    Light mainLight = GetMainLight();
    half3 lightDirWS = mainLight.direction;
    OUT.lightDirTS = TransformWorldToTangent(lightDirWS, tangentToWorld);
    float3 positionWS = TransformObjectToWorld(IN.positionOS.xyz);
    half3 viewDirWS = GetWorldSpaceNormalizeViewDir(positionWS);
    OUT.viewDirTS = TransformWorldToTangent(viewDirWS, tangentToWorld);
    return OUT;
}
```

这里使用了内置结构体VertexNormalInputs和内置方法GetVertexNormalInputs，GetVertexNormalInputs函数输入模型空间下的法线和切线，返回世界空间下的法线、切线和副切线，使用VertexNormalInputs结构体来接收数据，分别是normalWS、tangentWS和bitangentWS，当然，我们这里也可以手动直接计算世界空间下的法线和切线，因为我们后面用的方法用不到副切线。然后使用内置方法CreateTangentToWorld，接收世界空间下的法线方向、切线方向和tangentOS.w值，返回一个切线空间变换到世界空间的变换矩阵。最后使用了内置方法TransformWorldToTangent，传入世界空间下的光照方向或视角方向和tangentToWorld矩阵，返回切线空间下相应的光照方向或视角方向。注意这里是直接使用GetWorldSpaceNormalizeViewDir来获取世界空间下的视角方向。

由于我们在顶点着色器中完成了大部分工作，因此片元着色器中只需要采样得到切线空间下的法线方向，再在切线空间下进行光照计算即可：

```shaderlab
half4 frag (Varyings IN) : SV_Target
{
    Light mainLight = GetMainLight();
    half3 normalWS = normalize(IN.normalWS); 
    half3 lightDirTS = normalize(IN.lightDirTS);
    half3 viewDirTS = normalize(IN.viewDirTS);
    half4 packedNormal = SAMPLE_TEXTURE2D(_NormalMap, sampler_NormalMap, IN.uv0.zw);
    // 计算原理
    // half3 normalTS;
    // normalTS.xy = (packedNormal.xy * 2 - 1) * _NormalScale;
    // normalTS.z = sqrt(1.0 - saturate(dot(normalTS.xy, normalTS.xy)));
    half3 normalTS = UnpackNormalScale(packedNormal, _NormalScale);
    half3 albedo = SAMPLE_TEXTURE2D(_BaseMap, sampler_BaseMap, IN.uv0.xy).rgb * _Color.rgb;
    half3 ambient = SampleSH(normalWS) * albedo;
    half lambert = saturate(dot(normalTS, lightDirTS));
    half3 diffuse = mainLight.color * albedo * lambert;

    half3 halfDirTS = normalize(viewDirTS + lightDirTS);
    half3 specular = mainLight.color * _Specular.rgb * pow(saturate(dot(normalTS, halfDirTS)), _Smoothness);
    half3 finalColor = ambient + diffuse + specular;
    return half4(finalColor, 1.0); 
}
```

首先我们利用`SAMPLE_TEXTURE2D()`对法线纹理_NormalMap进行采样。正如一开始所说的，法线纹理中存储的是把法线经过映射后得到的像素值，因此我们需要把它们反映射回来。如果我们没有在Unity里法线纹理的类型设置为Normal map，就需要在代码中手动进行这个过程。我们首先packedNormal的xy分量按之前提到的公式映射回法线方向，然后乘以_NormalScale（控制凹凸程度）来得到normalTS的xy分量。由于法线都是单位矢量，因此normalTS.z分量可以由normalTS.xy计算而得。由于我们使用的是切线空间下的法线纹理，所以可以保证法线方向的z分量为正。但是在Unity中，为了方便Unity对法线纹理的存储进行优化，我们通常会把法线纹理的纹理类型标识成Normal map，Unity会根据平台来选择不同的压缩方式。这是，如果我们再用上面的方法来计算就会得到错误的结果，因为此时的_NormalMap的rgb分量不再是切线空间下的法线方向的xyz值。在这种情况下，我们可以使用Unity的内置函数UnpackNormalScale，传入packedNormal和_NormalScale来得到正确的法线方向。

需要注意的是，这里SampleSH采样环境光传入的normalWS而不是采样法线贴图转换后的normalWS，因为如果要求采样法线贴图转换后的normalWS就失去了在切线空间计算的意义，参考下面的在世界空间下计算，想要计算意味着需要所有世界空间下的数据。于是这里使用传过来的normalWS，虽然会导致法线贴图不会影响环境光，效果上会差一些。

完整代码：

```shaderlab
Shader "Unlit/NormalMapTangentSpace"
{
    Properties
    {
        _Color ("Color", Color) = (1, 1, 1, 1)
        _BaseMap ("Base Map", 2D) = "white" {}
        _Specular ("Specular", Color) = (1, 1, 1, 1)
        _Smoothness ("Smoothness", Range(8.0, 256)) = 20
        _NormalMap ("Normal Map", 2D) = "bump" {}
        _NormalScale ("Normal Scale", Float) = 1.0
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
            
            TEXTURE2D(_BaseMap);
            SAMPLER(sampler_BaseMap);
            TEXTURE2D(_NormalMap);
            SAMPLER(sampler_NormalMap);
            
            CBUFFER_START(UnityPerMaterial)
            float4 _BaseMap_ST;
            float4 _NormalMap_ST;
            float _NormalScale;
            half4 _Color;
            half4 _Specular;
            float _Smoothness;
            CBUFFER_END
            
            struct Attributes
            {
                float4 positionOS: POSITION;
                float3 normalOS: NORMAL;
                float4 tangentOS: TANGENT;
                float4 uv0: TEXCOORD0;
            };

            struct Varyings
            {
                float4 positionHCS: SV_POSITION;
                float4 uv0: TEXCOORD0;
                float3 lightDirTS: TEXCOORD1;
                float3 viewDirTS: TEXCOORD2;
                float3 normalWS: TEXCOORD3;
            };
            
            Varyings vert (Attributes IN)
            {
                Varyings OUT;
                OUT.positionHCS = TransformObjectToHClip(IN.positionOS.xyz);
                // OUT.normalWS = TransformObjectToWorldNormal(IN.normalOS);
                // OUT.uv0.xy = IN.uv0.xy * _BaseMap_ST.xy + _BaseMap_ST.zw;
                // OUT.uv0.zw = IN.uv0.xy * _NormalMap_ST.xy + _NormalMap_ST.zw;
                OUT.uv0.xy = TRANSFORM_TEX(IN.uv0, _BaseMap);
                OUT.uv0.zw = TRANSFORM_TEX(IN.uv0, _NormalMap);
                // 第一种计算方法
                // half3 binormal = cross(normalize(IN.normalOS), normalize(IN.tangentOS.xyz)) * IN.tangentOS.w;
                // float3x3 rotation = float3x3(normalize(IN.tangentOS.xyz), binormal, normalize(IN.normalOS));
                // Light mainLight = GetMainLight();
                // half3 lightDirWS = mainLight.direction;
                // half3 lightDirOS = TransformWorldToObjectDir(lightDirWS);
                // OUT.lightDirTS = mul(rotation, lightDirOS);
                // half3 viewDirOS = GetObjectSpaceNormalizeViewDir(IN.positionOS);
                // OUT.viewDirTS = mul(rotation, viewDirOS);
                VertexNormalInputs normalInputs = GetVertexNormalInputs(IN.normalOS, IN.tangentOS);
                OUT.normalWS = normalInputs.normalWS;
                float3x3 tangentToWorld = CreateTangentToWorld(normalInputs.normalWS, normalInputs.tangentWS, IN.tangentOS.w);
                Light mainLight = GetMainLight();
                half3 lightDirWS = mainLight.direction;
                OUT.lightDirTS = TransformWorldToTangent(lightDirWS, tangentToWorld);
                float3 positionWS = TransformObjectToWorld(IN.positionOS.xyz);
                half3 viewDirWS = GetWorldSpaceNormalizeViewDir(positionWS);
                OUT.viewDirTS = TransformWorldToTangent(viewDirWS, tangentToWorld);
                return OUT;
            }

            half4 frag (Varyings IN) : SV_Target
            {
                Light mainLight = GetMainLight();
                half3 normalWS = normalize(IN.normalWS); 
                half3 lightDirTS = normalize(IN.lightDirTS);
                half3 viewDirTS = normalize(IN.viewDirTS);
                half4 packedNormal = SAMPLE_TEXTURE2D(_NormalMap, sampler_NormalMap, IN.uv0.zw);
                // 计算原理
                // half3 normalTS;
                // normalTS.xy = (packedNormal.xy * 2 - 1) * _NormalScale;
                // normalTS.z = sqrt(1.0 - saturate(dot(normalTS.xy, normalTS.xy)));
                half3 normalTS = UnpackNormalScale(packedNormal, _NormalScale);
                half3 albedo = SAMPLE_TEXTURE2D(_BaseMap, sampler_BaseMap, IN.uv0.xy).rgb * _Color.rgb;
                half3 ambient = SampleSH(normalWS) * albedo;
                half lambert = saturate(dot(normalTS, lightDirTS));
                half3 diffuse = mainLight.color * albedo * lambert;
                
                half3 halfDirTS = normalize(viewDirTS + lightDirTS);
                half3 specular = mainLight.color * _Specular.rgb * pow(saturate(dot(normalTS, halfDirTS)), _Smoothness);
                half3 finalColor = ambient + diffuse + specular;
                return half4(finalColor, 1.0); 
            }
            ENDHLSL
        }
    }
    Fallback "Universal Render Pipeline/Simple Lit"
}

```

保存后，使用书中资源的Brick_Diffuse.jpg和Brick_Normal.jpg纹理对其赋值，我们可以调整Bump Scale属性来改变模型的凹凸程度。

有无法线贴图效果对比：

<!-- 这是一张图片，ocr 内容为： -->
![左：单张纹理  右：法线纹理](https://cdn.nlark.com/yuque/0/2026/png/61442912/1779259121833-2bfd7ae8-e432-465d-aefe-3f1fe71749fa.png)

不同凹凸程度对比：

<!-- 这是一张图片，ocr 内容为： -->
![左：-0.8     中：0.8      右：0](https://cdn.nlark.com/yuque/0/2026/png/61442912/1779259814319-f2bcf678-bf83-4d00-a4f2-184b292129f1.png)

## 实践：在世界空间下计算
现在，我们来实现第二种方法，即在世界空间下计算光照模型。我们需要从片元着色器中把法线方向从切线空间变换到世界空间。从顶点着色器中把世界空间下的基本信息传递给片元着色器，然后在片元着色器中计算其他的所有内容。

输入输出结构体：

```shaderlab
struct Attributes
{
    float4 positionOS: POSITION;
    float3 normalOS: NORMAL;
    float4 tangentOS: TANGENT;
    float4 uv0: TEXCOORD0;
};

struct Varyings
{
    float4 positionHCS: SV_POSITION;
    float4 uv0: TEXCOORD0;
    float3 positionWS: TEXCOORD1;
    float3 normalWS: TEXCOORD2;
    float4 tangentWS: TEXCOORD3;
};
```

在输出结构体中加入，世界空间下的顶点坐标、法线方向和切线方向。需要注意的是我们这里定义的tangentWS也是float4类型

顶点着色器：

```shaderlab
Varyings vert (Attributes IN)
{
    Varyings OUT;
    VertexPositionInputs positionInputs = GetVertexPositionInputs(IN.positionOS.xyz);
    OUT.positionHCS = positionInputs.positionCS;
    OUT.positionWS = positionInputs.positionWS;

    OUT.uv0.xy = TRANSFORM_TEX(IN.uv0, _BaseMap);
    OUT.uv0.zw = TRANSFORM_TEX(IN.uv0, _NormalMap);

    VertexNormalInputs normalInputs = GetVertexNormalInputs(IN.normalOS, IN.tangentOS);
    OUT.normalWS = normalInputs.normalWS;
    OUT.tangentWS = float4(normalInputs.tangentWS, IN.tangentOS.w);
    return OUT;
}
```

在上面代码中，我们使用了一种新的方法，GetVertexPositionInputs，输入模型空间下的顶点坐标，返回一个VertexPositionInputs结构体，里面自己计算好了各个空间下的顶点坐标，包括positionVS、positionWS、positionCS和positionNDC。这里我们使用positionCS和positonWS。然后在tangentWS的前三位填入世界空间下的切线方向，在第四位中填入原来模型空间下的w分量，用于决定副切线的方向性。

片元着色器：

```shaderlab
half4 frag (Varyings IN) : SV_Target
{
    Light mainLight = GetMainLight();
    half3 normalWS = normalize(IN.normalWS);
    half3 tangentWS = normalize(IN.tangentWS.xyz);
    float flipSign = IN.tangentWS.w;
    float3x3 tangentToWorld = CreateTangentToWorld(normalWS, tangentWS, flipSign);
    half3 lightDirWS = mainLight.direction;
    half3 viewDirWS = GetWorldSpaceNormalizeViewDir(IN.positionWS);

    half4 packedNormal = SAMPLE_TEXTURE2D(_NormalMap, sampler_NormalMap, IN.uv0.zw);
    half3 normalTS = UnpackNormalScale(packedNormal, _NormalScale);
    half3 finalNormalWS = TransformTangentToWorld(normalTS, tangentToWorld);

    half3 albedo = SAMPLE_TEXTURE2D(_BaseMap, sampler_BaseMap, IN.uv0.xy).rgb * _Color.rgb;
    half3 ambient = SampleSH(finalNormalWS) * albedo;
    half lambert = saturate(dot(finalNormalWS, lightDirWS));
    half3 diffuse = mainLight.color * albedo * lambert;

    half3 halfDirWS = normalize(viewDirWS + lightDirWS);
    half3 specular = mainLight.color * _Specular.rgb * pow(saturate(dot(finalNormalWS, halfDirWS)), _Smoothness);

    half3 finalColor = ambient + diffuse + specular;
    return half4(finalColor, 1.0); 
}
```

然后我们在片元着色器中计算世界空间下的光照，首先获取各种信息，主光源、使用世界空间下的顶点坐标获取世界空间下的视角方向、世界空间下的法线和切线以及flipSign用于填入CreateTangentToWorld决定副切线的方向性。然后使用CreateTangentToWorld来创建一个切线空间变换世界空间的变换矩阵。然后使用URP内置的UnpackNormalScale函数对法线纹理进行解码（需要把法线纹理的格式标识成Normal map），接着对其进行变换，使用TransformTangentToWorld方法，填入变换矩阵，变换到世界空间。后面就是正常的光照计算，需要注意的是，这里SampleSH使用了采样法线纹理转换到世界空间下的finalNormalWS，也就是法线贴图给的法线信息进行环境光采样。

完整代码：

```shaderlab
Shader "Unlit/NormalMapWorldSpace"
{
    Properties
    {
        _Color ("Color", Color) = (1, 1, 1, 1)
        _BaseMap ("Base Map", 2D) = "white" {}
        _Specular ("Specular", Color) = (1, 1, 1, 1)
        _Smoothness ("Smoothness", Range(8.0, 256)) = 20
        _NormalMap ("Normal Map", 2D) = "bump" {}
        _NormalScale ("Normal Scale", Float) = 1.0
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
            
            TEXTURE2D(_BaseMap);
            SAMPLER(sampler_BaseMap);
            TEXTURE2D(_NormalMap);
            SAMPLER(sampler_NormalMap);
            
            CBUFFER_START(UnityPerMaterial)
            float4 _BaseMap_ST;
            float4 _NormalMap_ST;
            float _NormalScale;
            half4 _Color;
            half4 _Specular;
            float _Smoothness;
            CBUFFER_END

            struct Attributes
            {
                float4 positionOS: POSITION;
                float3 normalOS: NORMAL;
                float4 tangentOS: TANGENT;
                float4 uv0: TEXCOORD0;
            };

            struct Varyings
            {
                float4 positionHCS: SV_POSITION;
                float4 uv0: TEXCOORD0;
                float3 positionWS: TEXCOORD1;
                float3 normalWS: TEXCOORD2;
                float4 tangentWS: TEXCOORD3;
            };
            
            Varyings vert (Attributes IN)
            {
                Varyings OUT;
                VertexPositionInputs positionInputs = GetVertexPositionInputs(IN.positionOS.xyz);
                OUT.positionHCS = positionInputs.positionCS;
                OUT.positionWS = positionInputs.positionWS;
                
                OUT.uv0.xy = TRANSFORM_TEX(IN.uv0, _BaseMap);
                OUT.uv0.zw = TRANSFORM_TEX(IN.uv0, _NormalMap);

                VertexNormalInputs normalInputs = GetVertexNormalInputs(IN.normalOS, IN.tangentOS);
                OUT.normalWS = normalInputs.normalWS;
                OUT.tangentWS = float4(normalInputs.tangentWS, IN.tangentOS.w);
                return OUT;
            }

            half4 frag (Varyings IN) : SV_Target
            {
                Light mainLight = GetMainLight();
                half3 normalWS = normalize(IN.normalWS);
                half3 tangentWS = normalize(IN.tangentWS.xyz);
                float flipSign = IN.tangentWS.w;
                float3x3 tangentToWorld = CreateTangentToWorld(normalWS, tangentWS, flipSign);
                half3 lightDirWS = mainLight.direction;
                half3 viewDirWS = GetWorldSpaceNormalizeViewDir(IN.positionWS);
                
                half4 packedNormal = SAMPLE_TEXTURE2D(_NormalMap, sampler_NormalMap, IN.uv0.zw);
                half3 normalTS = UnpackNormalScale(packedNormal, _NormalScale);
                half3 finalNormalWS = TransformTangentToWorld(normalTS, tangentToWorld);
                
                half3 albedo = SAMPLE_TEXTURE2D(_BaseMap, sampler_BaseMap, IN.uv0.xy).rgb * _Color.rgb;
                half3 ambient = SampleSH(finalNormalWS) * albedo;
                half lambert = saturate(dot(finalNormalWS, lightDirWS));
                half3 diffuse = mainLight.color * albedo * lambert;
                
                half3 halfDirWS = normalize(viewDirWS + lightDirWS);
                half3 specular = mainLight.color * _Specular.rgb * pow(saturate(dot(finalNormalWS, halfDirWS)), _Smoothness);
                
                half3 finalColor = ambient + diffuse + specular;
                return half4(finalColor, 1.0); 
            }
            ENDHLSL
        }
    }
    Fallback "Universal Render Pipeline/Simple Lit"
}
```

可以看出效果其实与在切线空间下计算没有太大区别。

<!-- 这是一张图片，ocr 内容为： -->
![在世界空间下计算](https://cdn.nlark.com/yuque/0/2026/png/61442912/1779294549960-a60a0f3d-e9fb-4bb1-a427-8c4281755686.png)

## Unity中的法线纹理类型
上面我们提到了当把法线纹理类型标识成Normal map时，可以使用URP内置函数UnpackNormalScale或者UnpackNormal（默认Scale为1）来得到正确的法线方向。即使你忘了设置，Unity也会在材质面板中提醒你修正这个问题。那么当我们把纹理类型设置成Normal map时到底发生了什么，为什么要这么做？

简单来说，这么做可以让Unity根据不同平台对纹理进行压缩（例如使用DXT5nm格式，具体的压缩细节不在赘述，可以上网搜），再通过UnpackNormalScale函数来针对不同的压缩格式对法线纹理进行正确的采样。我们可以在Packing.hlsl中找到函数的具体实现。

```shaderlab
// Assume f [-1..1]
real3 UnpackNormalTetraEncode(real2 f, uint faceIndex)
{
    // Recover n from local plane
    real3 n = real3(f.xy, sqrt(1.0 - dot(f.xy, f.xy)));
    // Inverse of transform PackNormalTetraEncode (just swap order in mul as we have a rotation)
    return mul(n, tetraBasisArray[faceIndex]);
}

// Unpack from normal map
real3 UnpackNormalRGB(real4 packedNormal, real scale = 1.0)
{
    real3 normal;
    normal.xyz = packedNormal.rgb * 2.0 - 1.0;
    normal.xy *= scale;
    return normal;
}

real3 UnpackNormalRGBNoScale(real4 packedNormal)
{
    return packedNormal.rgb * 2.0 - 1.0;
}

real3 UnpackNormalAG(real4 packedNormal, real scale = 1.0)
{
    real3 normal;
    normal.xy = packedNormal.ag * 2.0 - 1.0;
    normal.z = max(1.0e-16, sqrt(1.0 - saturate(dot(normal.xy, normal.xy))));

    // must scale after reconstruction of normal.z which also
    // mirrors UnpackNormalRGB(). This does imply normal is not returned
    // as a unit length vector but doesn't need it since it will get normalized after TBN transformation.
    // If we ever need to blend contributions with built-in shaders for URP
    // then we should consider using UnpackDerivativeNormalAG() instead like
    // HDRP does since derivatives do not use renormalization and unlike tangent space
    // normals allow you to blend, accumulate and scale contributions correctly.
    normal.xy *= scale;
    return normal;
}

// Unpack normal as DXT5nm (1, y, 0, x) or BC5 (x, y, 0, 1)
real3 UnpackNormalmapRGorAG(real4 packedNormal, real scale = 1.0)
{
    // Convert to (?, y, 0, x)
    packedNormal.a *= packedNormal.r;
    return UnpackNormalAG(packedNormal, scale);
}

#ifndef BUILTIN_TARGET_API
real3 UnpackNormal(real4 packedNormal)
{
#if defined(UNITY_ASTC_NORMALMAP_ENCODING)
    return UnpackNormalAG(packedNormal, 1.0);
#elif defined(UNITY_NO_DXT5nm)
    return UnpackNormalRGBNoScale(packedNormal);
#else
    // Compiler will optimize the scale away
    return UnpackNormalmapRGorAG(packedNormal, 1.0);
#endif
}
#endif

real3 UnpackNormalScale(real4 packedNormal, real bumpScale)
{
#if defined(UNITY_ASTC_NORMALMAP_ENCODING)
    return UnpackNormalAG(packedNormal, bumpScale);
#elif defined(UNITY_NO_DXT5nm)
    return UnpackNormalRGB(packedNormal, bumpScale);
#else
    return UnpackNormalmapRGorAG(packedNormal, bumpScale);
#endif
}
```

在代码中可以看出，在某些平台上由于使用了DXT5nm压缩格式，因此需要针对这种格式对法线进行解码。在DXT5nm格式的法线纹理中，纹素的a通道（即w分量）对应了法线的x分量，g通道对应了法线的y分量，而纹理r和b通道则会被舍弃，法线的z分量可以由xy分量推导而得。为什么之前的普通纹理不能按这种方式压缩，而法线就需要使用DXT5nm格式来进行压缩？这是因为，按我们之前的处理方式，法线纹理被当成一个和普通纹理无异的图，但实际上，它只有两个通道是真正必不可少的，因为第三个通道的值可以用另外两个推导出来，使用这种方法可以减少法线纹理占用的内存空间。

当我们把纹理类型设置成Normal map后，还有一个复选框是 Create from GrayScale，那么它是做什么用的呢？之前我们说过还有一种凹凸映射的方法，即使用高度图，而这个复选框就是用于从高度图中生成法线纹理的。高度图本身记录的是相对高度，是一张灰度图，白色表示相对更高，黑色表示相对更低。当我们把一张高度图导入Unity后，除了需要把它的类型设置成Normal map外，还需要勾选 Create from GrayScale，这样就可以得到类似于下图的结果，然后我们就可以把它和切线空间下的法线纹理同等对待了。

<!-- 这是一张图片，ocr 内容为：WALL_HEIGHT INSPECTOR WALL_HEIGHT(TEXTURE 2D)LMPORT SETTIR OPEN TEXTURE TYPE NORMAL MAP 2D TEXTURE SHAPE CREATE FROM GRAYSCA, 0.01 BUMPINESS FILTERING SHARP FLIPGREENCHANNEL ADVANCED TONEAREST NON-POWER OF 2 READ/WRITE VIRTUAL TEXTURE ON GENERATE MIPMAP USE MIPMAP LI MIPMAP LIMI NONE(USE GLOBAL MIPMAP LIMI MIP STREAMING MIPMAP FILTERIN BOX PRESERVE COVEL REPLICATE BORDE FADEOUT TO GRA SWIZZLE B A G WRAP MODE REPEAT FILTER MODE BILINEAR WALL_HEIGHT WALL_HEIGHT 1024X1024 DXTNM 1.3MB -->
![勾选了Create from Grayscale后，Unity会根据高度图来生成一张切线空间下的法线纹理](https://cdn.nlark.com/yuque/0/2026/png/61442912/1779669554834-8bbbe732-fa95-4847-9375-4e545120730a.png)

当勾选了 Create from GrayScale 后，还多了出了两个选项——Bumpiness 和 Filtering。其中 Bumpiness 用于控制凹凸程度，而 Filtering 决定我们使用哪种方法来计算凹凸程度，它有两种选项，一种是 Smooth，这使得生成后的法线纹理会比较平滑；另一种是 Sharp，它会使用 Sobel 滤波（一种边缘检测时使用的滤波器）来生成法线。Sobel 滤波的实现非常简单，我们只需要在一个3x3的滤波器中计算 x 和 y 方向上的导数，然后从中得到法线即可。具体方法是：对于高度图中的每个像素，我们考虑它与水平方向和竖直方向上的像素差，把它们的差当成该点对应的法线在 x 和 y 方向上的位移，然后使用之前提到的映射函数存储成到法线纹理的 r 和 g 分量即可。

# 渐变纹理
尽管在一开始，我们在渲染中使用纹理是为了定义一个物体的颜色，但后来人们发现，纹理其实可以用于存储任何表面属性。一种常见的用法就是使用渐变纹理来控制漫反射光照的结果。在之前计算漫反射时，我们都是使用表面法线和光照方向的点积结果与材质的反射率相乘来得到表面的漫反射光照。但是有时我们需要更加灵活地控制光照结果。这种技术在游戏《军团要塞2》中流行起来，它也是由Valve公司提出来的，他们使用这种技术来渲染游戏中具有插画风格的角色。

这种技术最初由Gooch等人在1998年他们发表的一篇著名论文中提出，论文中，作者提出了一种基于冷到暖色调的着色技术，用来得到一种插画风格的渲染效果。使用这种技术，可以保证物体的轮廓线相比于之前使用的传统漫反射光照更加明显，而且能够提供多种色调变化。而现在，很多卡通风格的渲染中都使用了这种技术，我们在14章会专门学习如果专门编写一个卡通风格的shader。

这里我们将学习如何使用一张渐变纹理来控制漫反射光照。

首先声明纹理属性，_RampMap用于存储渐变纹理：

```shaderlab
Properties
{
    _Color ("Color", Color) = (1, 1, 1, 1)
    _RampMap ("Ramp Map", 2D) = "white" {}
    _Specular ("Specular", Color) = (1, 1, 1, 1)
    _Smoothness ("Smoothness", Range(8.0, 256)) = 20
}
```

随后在Pass中定义与Properties中各个属性相匹配的变量：

```shaderlab
TEXTURE2D(_RampMap);
SAMPLER(sampler_RampMap);

CBUFFER_START(UnityPerMaterial)
float4 _RampMap_ST;
half4 _Color;
half4 _Specular;
float _Smoothness;
CBUFFER_END
```

之后定义输入和输出结构体：

```shaderlab
struct Attributes
{
    float4 positionOS: POSITION;
    float3 normalOS: NORMAL;
    float4 uv0: TEXCOORD0;
};

struct Varyings
{
    float4 positionHCS: SV_POSITION;
    float3 positionWS: TEXCOORD0;
    float3 normalWS: TEXCOORD1;
    float2 uv0: TEXCOORD2;
};
```

定义顶点着色器：

```shaderlab
Varyings vert (Attributes IN)
{
    Varyings OUT;
    VertexPositionInputs positionInputs = GetVertexPositionInputs(IN.positionOS.xyz);
    OUT.positionHCS = positionInputs.positionCS;
    OUT.positionWS = positionInputs.positionWS;
    OUT.normalWS = TransformObjectToWorldNormal(IN.normalOS);
    OUT.uv0 = TRANSFORM_TEX(IN.uv0, _RampMap);
    return OUT;
}
```

这里代码很简单，只需要把世界空间下的顶点坐标和法线传过去即可，然后计算经过平铺和偏移后的纹理坐标，但其实这里的uv0没有任何用处，在下面我们会使用计算的半兰伯特值作为uv0。

接下来是关键的片元着色器：

```shaderlab
half4 frag (Varyings IN) : SV_Target
{
    Light mainLight = GetMainLight();
    half3 normalWS = normalize(IN.normalWS);
    half3 lightDirWS = mainLight.direction;

    half3 ambient = SampleSH(normalWS);

    half lambert = dot(normalWS, lightDirWS);
    half halfLambert = lambert * 0.5 + 0.5;
    half2 RampUV;
    RampUV.x = halfLambert;
    RampUV.y = 0.5;
    half3 diffuseColor = SAMPLE_TEXTURE2D(_RampMap, sampler_RampMap, RampUV).rgb * _Color.rgb;
    half3 diffuse = mainLight.color * diffuseColor;

    half3 viewDirWS = GetWorldSpaceNormalizeViewDir(IN.positionWS);
    half3 halfDirWS = normalize(viewDirWS + lightDirWS);
    half3 specular = mainLight.color * _Specular.rgb * pow(max(0, dot(normalWS, halfDirWS)), _Smoothness);

    half3 finalColor = ambient + diffuse + specular;
    return half4(finalColor, 1.0); 
}
```

在上面的代码中，我们使用了上一章中提到的半兰伯特模型，通过对法线方向和光照方向的点积做一次0.5倍缩放以及0.5大小的偏移来计算半兰伯特部分halfLambert。这样我们得到的halfLambert的范围被映射到了[0, 1]之间。之后，我们使用halfLambert来构建一个纹理坐标，并用这个纹理坐标对渐变纹理RampMap进行采样。由于_RampMap实际上就是一个一维纹理（它在纵轴方向上的颜色不变），如下图，因此纹理坐标的u使用halfLambert，v方向可以用[0, 1]的任意值。然后，把从渐变纹理采样得到的颜色和材质颜色mainLight.color相乘，得到最终的漫反射颜色，剩下的代码就很熟悉了，不再赘述。

<!-- 这是一张图片，ocr 内容为： -->
![渐变纹理 0](https://cdn.nlark.com/yuque/0/2026/png/61442912/1779673141876-6c01840e-701c-4276-b9f6-6935f7a843ce.png)

<!-- 这是一张图片，ocr 内容为： -->
![渐变纹理 1](https://cdn.nlark.com/yuque/0/2026/png/61442912/1779673123714-96458e03-9f6e-4a57-83f8-4c7ca8de4ea1.png)

<!-- 这是一张图片，ocr 内容为： -->
![渐变纹理 2](https://cdn.nlark.com/yuque/0/2026/png/61442912/1779673166315-e379a041-5e99-4757-a5cd-9fed19b857f0.png)

完整代码：

```shaderlab
Shader "Unlit/RampTexture"
{
    Properties
    {
        _Color ("Color", Color) = (1, 1, 1, 1)
        _RampMap ("Ramp Map", 2D) = "white" {}
        _Specular ("Specular", Color) = (1, 1, 1, 1)
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
            
            TEXTURE2D(_RampMap);
            SAMPLER(sampler_RampMap);
            
            CBUFFER_START(UnityPerMaterial)
            float4 _RampMap_ST;
            half4 _Color;
            half4 _Specular;
            float _Smoothness;
            CBUFFER_END
            
            struct Attributes
            {
                float4 positionOS: POSITION;
                float3 normalOS: NORMAL;
                float4 uv0: TEXCOORD0;
            };

            struct Varyings
            {
                float4 positionHCS: SV_POSITION;
                float3 positionWS: TEXCOORD0;
                float3 normalWS: TEXCOORD1;
                float2 uv0: TEXCOORD2;
            };
            
            Varyings vert (Attributes IN)
            {
                Varyings OUT;
                VertexPositionInputs positionInputs = GetVertexPositionInputs(IN.positionOS.xyz);
                OUT.positionHCS = positionInputs.positionCS;
                OUT.positionWS = positionInputs.positionWS;
                OUT.normalWS = TransformObjectToWorldNormal(IN.normalOS);
                OUT.uv0 = TRANSFORM_TEX(IN.uv0, _RampMap);
                return OUT;
            }

            half4 frag (Varyings IN) : SV_Target
            {
                Light mainLight = GetMainLight();
                half3 normalWS = normalize(IN.normalWS);
                half3 lightDirWS = mainLight.direction;
                
                half3 ambient = SampleSH(normalWS);
                
                half lambert = dot(normalWS, lightDirWS);
                half halfLambert = lambert * 0.5 + 0.5;
                half2 RampUV;
                RampUV.x = halfLambert;
                RampUV.y = 0.5;
                half3 diffuseColor = SAMPLE_TEXTURE2D(_RampMap, sampler_RampMap, RampUV).rgb * _Color.rgb;
                half3 diffuse = mainLight.color * diffuseColor;
                
                half3 viewDirWS = GetWorldSpaceNormalizeViewDir(IN.positionWS);
                half3 halfDirWS = normalize(viewDirWS + lightDirWS);
                half3 specular = mainLight.color * _Specular.rgb * pow(max(0, dot(normalWS, halfDirWS)), _Smoothness);
                
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
![使用上面三张不同渐变纹理的效果](https://cdn.nlark.com/yuque/0/2026/png/61442912/1779673437667-2cdc5bd8-a237-4950-a681-adeb31c3ef0a.png)

可以看出，使用这种方式可以自由地控制物体的漫反射光照，不同的渐变纹理有不同的特性。例如，在中间的模型中，我们使用了一张从紫色调到浅黄色调的渐变纹理，而右边的渐变纹理与《军团要塞2》中渲染人物使用的渐变纹理是类似的，从黑色到灰色，中间分界线部分微微发红。左侧的渐变纹理则通常用于卡通风格的渲染，这种渐变纹理中的色调通常是突变的，即没有平滑过渡，用于模拟卡通渲染中的阴影色块。

还有一个需要注意的点，我们需要把渐变纹理的 Wrap Mode 设为 Clamp 模式，以防止对纹理进行采样时由于浮点精度而造成的问题，如下图：

<!-- 这是一张图片，ocr 内容为： -->
![Repeat模式](https://cdn.nlark.com/yuque/0/2026/png/61442912/1779673895512-38ba12ea-a246-4fe6-bca5-4ddbaf889d7c.png)<!-- 这是一张图片，ocr 内容为： -->
![Clamp模式](https://cdn.nlark.com/yuque/0/2026/png/61442912/1779673909989-24ff052e-26ea-4c57-9cfb-679ad595a30d.png)

能看出在Repeat模式的渐变纹理情况下，在模型的阴影部分有一些亮点，这是由于浮点精度造成的，当我们使用half2(halfLambert, 0.5))对渐变纹理进行采样时，虽然理论上halfLambert的值在[0, 1]之间，但可能会有-0.00001或者1.000001这样的值出现。如果我们使用的Repeat模式，此时-0.00001回绕到0.999999，也就是最右边的亮色。我们只需要把渐变纹理的Wrap Mode设置为Clamp模式就可以解决这种问题了。

# 遮罩纹理
则遮罩纹理是本章要介绍的最后一种纹理，它非常有用，在很多游戏中都能见到它的身影。那么什么是遮罩呢，遮罩允许我们可以保护某些区域，使它们免于某些修改。例如，在之前的实现中，我们都是把高光反射应用到模型表面的所有地方，即所有的像素都使用相同大小的高光强度和高光系数。但有时，我们希望模型表面某些区域的反射光强烈一些，而某些区域弱一些。为了得到更加细腻的效果，我们就可以使用一张遮罩纹理来控制光照。另一种常见的应用是在制作地形材质时需要混合多张图片，例如表现草地的纹理、表现石子的纹理等，使用遮罩纹理可以控制如何混合这些纹理。

使用遮罩纹理的流程一般是：通过采样得到遮罩纹理的纹素值，然后使用其中某个（或某几个）通道的值（例如texel.r）来与某种表面属性进行相乘，这样，当该通道的值为0时，可以保护表面不受该属性的影响。总而言之，使用遮罩可以让美术人员更加精准（像素级别）地控制模型表面的各种性质。

这里我们将从上文的切线空间下计算法线纹理的代码的基础上修改添加遮罩纹理：

首先修改原来的Properties，声明更多的变量来控制高光：

```shaderlab
Properties
{
    _Color ("Color", Color) = (1, 1, 1, 1)
    _BaseMap ("Base Map", 2D) = "white" {}
    _Specular ("Specular", Color) = (1, 1, 1, 1)
    _SpecularMaskMap ("Specular Mask Map", 2D) = "white" {}   // 新增 遮罩纹理
    _SpecularScale ("Specular Scale", Float) = 1.0  // 控制遮罩纹理影响的系数
    _Smoothness ("Smoothness", Range(8.0, 256)) = 20
    _NormalMap ("Normal Map", 2D) = "bump" {}
    _NormalScale ("Normal Scale", Float) = 1.0
}
```

修改Pass中声明的相对应的变量：

```shaderlab
TEXTURE2D(_BaseMap);
SAMPLER(sampler_BaseMap);
TEXTURE2D(_NormalMap);
SAMPLER(sampler_NormalMap);
TEXTURE2D(_SpecularMaskMap);
SAMPLER(sampler_SpecularMaskMap);

CBUFFER_START(UnityPerMaterial)
float4 _BaseMap_ST;
half4 _Color;
float4 _NormalMap_ST;
float _BumpScale;
float4 _SpecularMaskMap_ST;
half4 _Specular;
float _SpecularScale;
float _Smoothness;
CBUFFER_END
```

修改输入输出结构体：

```shaderlab
struct Attributes
{
    float4 positionOS: POSITION;
    float3 normalOS: NORMAL;
    float4 tangentOS: TANGENT;
    float4 uv0: TEXCOORD0;
};

struct Varyings
{
    float4 positionHCS: SV_POSITION;
    float2 uv0: TEXCOORD0;
    float3 lightDirTS: TEXCOORD1;
    float3 viewDirTS: TEXCOORD2;
    float3 normalWS: TEXCOORD3;
};
```

输入结构体不用变，这里把输出结构体的uv0改成了一个二维变量，我们不再单独使用法线纹理的纹理坐标，统一使用一个纹理坐标，也就是主纹理的纹理坐标。

修改顶点着色器：

```shaderlab
Varyings vert (Attributes IN)
{
    Varyings OUT;
    VertexPositionInputs positionInputs = GetVertexPositionInputs(IN.positionOS.xyz);
    OUT.positionHCS = positionInputs.positionCS;
    float3 positionWS = positionInputs.positionWS;

    OUT.uv0 = TRANSFORM_TEX(IN.uv0, _BaseMap);

    VertexNormalInputs normalInputs = GetVertexNormalInputs(IN.normalOS, IN.tangentOS);
    OUT.normalWS = normalInputs.normalWS;
    float3x3 tangentToWorld = CreateTangentToWorld(normalInputs.normalWS, normalInputs.tangentWS, IN.tangentOS.w);
    Light mainLight = GetMainLight();
    half3 lightDirWS = mainLight.direction;
    OUT.lightDirTS = TransformWorldToTangent(lightDirWS, tangentToWorld);
    half3 viewDirWS = GetWorldSpaceNormalizeViewDir(positionWS);
    OUT.viewDirTS = TransformWorldToTangent(viewDirWS, tangentToWorld);

    return OUT;
}
```

对计算主纹理的经过平铺和偏移后的纹理坐标，然后使用CreateTangentToWorld方法创建切线空间变换到世界空间的变换矩阵，然后计算切线空间下的光线方向和视角方向传递给片元着色器。

接下来修改片元着色器：

```shaderlab
half4 frag (Varyings IN) : SV_Target
{
    Light mainLight = GetMainLight();
    half3 normalWS = normalize(IN.normalWS); 
    half3 lightDirTS = normalize(IN.lightDirTS);
    half3 viewDirTS = normalize(IN.viewDirTS);

    half4 packedNormal = SAMPLE_TEXTURE2D(_NormalMap, sampler_NormalMap, IN.uv0);
    half3 normalTS = UnpackNormalScale(packedNormal, _BumpScale);

    half3 albedo = SAMPLE_TEXTURE2D(_BaseMap, sampler_BaseMap, IN.uv0).rgb * _Color.rgb;
    half3 ambient = SampleSH(normalWS) * albedo;
    half lambert = saturate(dot(normalTS, lightDirTS));
    half3 diffuse = mainLight.color * albedo * lambert;

    half3 halfDirTS = normalize(viewDirTS + lightDirTS);
    half specularMask = SAMPLE_TEXTURE2D(_SpecularMaskMap, sampler_SpecularMaskMap, IN.uv0).r * _SpecularScale;
    half3 specular = mainLight.color * _Specular.rgb * pow(saturate(dot(normalTS, halfDirTS)), _Smoothness) * specularMask;

    half3 finalColor = ambient + diffuse + specular;
    return half4(finalColor, 1.0); 
}
```

使用UnpackNormalScale对采样后的切线空间下的法线纹理映射回[-1, 1]，并乘上系数。这里我们在计算高光反射中添加了一个新的变量specularMask，对遮罩纹理进行采样并乘上系数得到，由于这里使用的遮罩纹理中每个纹素的rgb分量其实都一样，表明了该点对应的高光反射强度，在这里我们使用 r 分量来计算掩码值。选用说明的是，我们使用的这张遮罩纹理其实有很多空间被浪费了——它的rgb分量存储的都是同一个值，在实际的游戏制作中，我们往往会充分利用遮罩纹理中的每一个颜色通道来存储不同的表面属性，例如，我们可以选择 r 通道存储高光反射的强度，使用 g 通道存储边缘光照的强度，使用 b 通道存储高光反射的指数（_Smoothness），a 通道存储自发光强度。

完整代码：

```shaderlab
Shader "Unlit/MaskTexture"
{
    Properties
    {
        _Color ("Color", Color) = (1, 1, 1, 1)
        _BaseMap ("Base Map", 2D) = "white" {}
        _Specular ("Specular", Color) = (1, 1, 1, 1)
        _SpecularMaskMap ("Specular Mask Map", 2D) = "white" {}
        _SpecularScale ("Specular Scale", Float) = 1.0
        _Smoothness ("Smoothness", Range(8.0, 256)) = 20
        _NormalMap ("Normal Map", 2D) = "bump" {}
        _NormalScale ("Normal Scale", Float) = 1.0
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
            
            TEXTURE2D(_BaseMap);
            SAMPLER(sampler_BaseMap);
            TEXTURE2D(_NormalMap);
            SAMPLER(sampler_NormalMap);
            TEXTURE2D(_SpecularMaskMap);
            SAMPLER(sampler_SpecularMaskMap);
            
            CBUFFER_START(UnityPerMaterial)
            float4 _BaseMap_ST;
            half4 _Color;
            float4 _NormalMap_ST;
            float _BumpScale;
            float4 _SpecularMaskMap_ST;
            half4 _Specular;
            float _SpecularScale;
            float _Smoothness;
            CBUFFER_END
            
            struct Attributes
            {
                float4 positionOS: POSITION;
                float3 normalOS: NORMAL;
                float4 tangentOS: TANGENT;
                float4 uv0: TEXCOORD0;
            };

            struct Varyings
            {
                float4 positionHCS: SV_POSITION;
                float2 uv0: TEXCOORD0;
                float3 lightDirTS: TEXCOORD1;
                float3 viewDirTS: TEXCOORD2;
                float3 normalWS: TEXCOORD3;
            };
            
            Varyings vert (Attributes IN)
            {
                Varyings OUT;
                VertexPositionInputs positionInputs = GetVertexPositionInputs(IN.positionOS.xyz);
                OUT.positionHCS = positionInputs.positionCS;
                float3 positionWS = positionInputs.positionWS;

                OUT.uv0 = TRANSFORM_TEX(IN.uv0, _BaseMap);

                VertexNormalInputs normalInputs = GetVertexNormalInputs(IN.normalOS, IN.tangentOS);
                OUT.normalWS = normalInputs.normalWS;
                float3x3 tangentToWorld = CreateTangentToWorld(normalInputs.normalWS, normalInputs.tangentWS, IN.tangentOS.w);
                Light mainLight = GetMainLight();
                half3 lightDirWS = mainLight.direction;
                OUT.lightDirTS = TransformWorldToTangent(lightDirWS, tangentToWorld);
                half3 viewDirWS = GetWorldSpaceNormalizeViewDir(positionWS);
                OUT.viewDirTS = TransformWorldToTangent(viewDirWS, tangentToWorld);
                
                return OUT;
            }

            half4 frag (Varyings IN) : SV_Target
            {
                Light mainLight = GetMainLight();
                half3 normalWS = normalize(IN.normalWS); 
                half3 lightDirTS = normalize(IN.lightDirTS);
                half3 viewDirTS = normalize(IN.viewDirTS);
                
                half4 packedNormal = SAMPLE_TEXTURE2D(_NormalMap, sampler_NormalMap, IN.uv0);
                half3 normalTS = UnpackNormalScale(packedNormal, _BumpScale);
                
                half3 albedo = SAMPLE_TEXTURE2D(_BaseMap, sampler_BaseMap, IN.uv0).rgb * _Color.rgb;
                half3 ambient = SampleSH(normalWS) * albedo;
                half lambert = saturate(dot(normalTS, lightDirTS));
                half3 diffuse = mainLight.color * albedo * lambert;
                
                half3 halfDirTS = normalize(viewDirTS + lightDirTS);
                half specularMask = SAMPLE_TEXTURE2D(_SpecularMaskMap, sampler_SpecularMaskMap, IN.uv0).r * _SpecularScale;
                half3 specular = mainLight.color * _Specular.rgb * pow(saturate(dot(normalTS, halfDirTS)), _Smoothness) * specularMask;
                
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
![左：漫反射                   中：漫反射+高光反射              右：漫反射+高光反射+遮罩](https://cdn.nlark.com/yuque/0/2026/png/61442912/1779678072429-b34d5d39-fee1-4c87-bc08-0e2efb2f4b46.png)



